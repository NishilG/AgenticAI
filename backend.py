from flask import Flask, render_template, request, jsonify, send_from_directory
import smtplib
from email.message import EmailMessage
import requests
import json
import os
from dotenv import load_dotenv
import ast
import re
import asyncio
import base64
import datetime
from datetime import datetime
import glob
# Removed pandas, io, uuid, Path imports

# Attempt to import browser_use components, handle potential ImportError
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from browser_use import Agent as BrowserAgent # Renamed to avoid conflict
    LANGCHAIN_AVAILABLE = True
except ImportError:
    print("Warning: browser_use or langchain_google_genai not found. BrowserUse tool will not function.")
    ChatGoogleGenerativeAI = None
    BrowserAgent = None
    LANGCHAIN_AVAILABLE = False


# Load environment variables
load_dotenv()

app = Flask(__name__)

# --- Configuration ---
# Create a directory for temporary plots if it doesn't exist
UPLOAD_FOLDER = 'uploads'
STATIC_FOLDER = 'static'
PLOT_FOLDER = os.path.join(STATIC_FOLDER, 'plots')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PLOT_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PLOT_FOLDER'] = PLOT_FOLDER


# --- Helper Functions ---

def send_email(sender_email, sender_password, receiver_email, subject, body):
    """Sends an email using Gmail's SMTP server."""
    msg = EmailMessage()
    msg.set_content(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = receiver_email

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(sender_email, sender_password)
            smtp.send_message(msg)
        return True, "Email sent successfully!"
    except Exception as e:
        print(f"Error sending email: {e}") # Log error server-side
        return False, f"Error sending email: {e}"

def get_gemini_response(prompt, gemini_api_key):
    """Uses Gemini API to get a response based on the prompt using REST API (expects JSON-like)."""
    # Use gemini-1.5-flash model (Adjust if needed)
    # url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
    # Using 1.5 Pro as it might be better for structured output
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
         # Add safety settings to potentially reduce blocks for JSON
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ],
        "generationConfig": {
             "response_mime_type": "application/json", # Request JSON output
             "temperature": 0.3 # Lower temperature for more predictable JSON
        }
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        response_json = response.json()

        # Check for blocked content
        if not response_json.get('candidates'):
             finish_reason = response_json.get('promptFeedback', {}).get('blockReason')
             if finish_reason:
                 print(f"Gemini request blocked: {finish_reason}")
                 return f"Error: Response blocked by API ({finish_reason})"
             else:
                 print("Gemini response missing candidates:", response_json)
                 return "Error: Invalid response from Gemini API (No candidates)"

        # Extract text, handling potential structure variations
        try:
            content = response_json['candidates'][0]['content']
            if 'parts' in content and content['parts']:
                 # Check if the first part is text
                 if 'text' in content['parts'][0]:
                      return content['parts'][0]['text']
                 else:
                      print("Gemini response part is not text:", content['parts'][0])
                      return "Error: Unexpected response format from Gemini (Part not text)"
            else:
                 print("Gemini response missing parts:", content)
                 return "Error: Invalid response format from Gemini (Missing parts)"
        except (KeyError, IndexError, TypeError) as e:
            print(f"Error parsing Gemini response structure: {e}", response_json)
            return f"Error: Could not parse Gemini response ({e})"

    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Gemini API: {e}")
        return f"Error connecting to Gemini API: {str(e)}"
    except Exception as e:
        print(f"Unexpected error in get_gemini_response: {e}")
        return f"Unexpected error: {str(e)}"


def search_information(query, api_key, search_engine_id):
    """Search for information related to the query using Google Custom Search."""
    base_url = "https://www.googleapis.com/customsearch/v1"
    params = {'key': api_key, 'cx': search_engine_id, 'q': query, 'num': 5}

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        results = response.json()

        search_data = []
        if 'items' in results and results['items']:
            for item in results['items']:
                search_data.append({
                    'title': item.get('title', 'No title'),
                    'link': item.get('link', '#'),
                    'snippet': item.get('snippet', 'No description available')
                })
        else:
             print(f"No search results found for query: {query}")
             # Return empty list instead of string message for consistency
             # return "No relevant information found for this query."

        return search_data # Return list of dicts or empty list

    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Google Search API: {e}")
        return f"Error connecting to Google Search API: {str(e)}" # Return error string
    except Exception as e:
        print(f"Unexpected error in search_information: {e}")
        return f"Unexpected error during search: {str(e)}" # Return error string


def ai_generate(input_text, gemini_api_key, search_data_list=[]):
    """Generate email subject and body based on user prompt and optional search data."""
    gemini_prompt = """# System Instructions for Email Generation
You are an AI assistant that generates professional email content.
Create an appropriate email based on the user's request.
Format your response as plain text without any additional commentary.
Focus on creating a professional, well-structured email with appropriate tone.
"""

    # Format search data for the prompt
    search_context = ""
    if isinstance(search_data_list, list) and search_data_list:
        search_context += "\n\nHere is some relevant information that might be helpful:\n"
        for item in search_data_list:
            search_context += f"- Title: {item.get('title', 'N/A')}\n  Link: {item.get('link', 'N/A')}\n  Snippet: {item.get('snippet', 'N/A')}\n"
    elif isinstance(search_data_list, str) and search_data_list.startswith("Error"):
         # Include search error message if applicable
         search_context += f"\n\nNote: There was an error during information search: {search_data_list}\n"


    # Generate email body
    body_prompt = gemini_prompt + search_context + "\n\nUser request: " + input_text
    # Use standard text generation for body and subject
    body = get_gemini_response_text(body_prompt, gemini_api_key)

    if body.startswith("Error"): # Propagate errors
        return "Error", body

    # Generate subject line
    subject_prompt = f"Generate a concise and relevant one subject line for this email and nothing else dont ask questions or give multiple options: {body}"
    subject = get_gemini_response_text(subject_prompt, gemini_api_key)

    if subject.startswith("Error"): # Propagate errors
        return "Error generating subject", body # Return body even if subject fails

    # Remove any quotes or extra formatting from subject
    subject = subject.strip().strip('"').strip("'")

    return subject, body

def get_gemini_response_text(prompt, gemini_api_key):
     """Gets standard text response from Gemini, similar to original get_gemini_response but without JSON expectation."""
     # url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
     url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}" # Use 1.5 Pro
     headers = {'Content-Type': 'application/json'}
     data = {
         "contents": [{"parts": [{"text": prompt}]}],
         "safetySettings": [ # Keep safety settings relaxed
             {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
             {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
             {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
             {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
         ],
         "generationConfig": {
             "temperature": 0.7, # Standard temperature for creative text
             "maxOutputTokens": 1500 # Increased token limit slightly
         }
     }
     try:
         response = requests.post(url, headers=headers, data=json.dumps(data))
         response.raise_for_status()
         response_json = response.json()

         if not response_json.get('candidates'):
             finish_reason = response_json.get('promptFeedback', {}).get('blockReason')
             if finish_reason:
                 print(f"Gemini text request blocked: {finish_reason}")
                 return f"Error: Response blocked by API ({finish_reason})"
             else:
                 print("Gemini text response missing candidates:", response_json)
                 return "Error: Invalid response from Gemini API (No candidates)"

         try:
             content = response_json['candidates'][0]['content']
             if 'parts' in content and content['parts'] and 'text' in content['parts'][0]:
                 return content['parts'][0]['text']
             else:
                 print("Gemini text response missing parts/text:", content)
                 return "Error: Invalid response format from Gemini (Missing parts/text)"
         except (KeyError, IndexError, TypeError) as e:
             print(f"Error parsing Gemini text response structure: {e}", response_json)
             return f"Error: Could not parse Gemini text response ({e})"

     except requests.exceptions.RequestException as e:
         print(f"Error connecting to Gemini API for text: {e}")
         return f"Error connecting to Gemini API: {str(e)}"
     except Exception as e:
         print(f"Unexpected error in get_gemini_response_text: {e}")
         return f"Unexpected error: {str(e)}"


def relavent_search_query(prompt, api_key):
    search_query = get_gemini_response_text("There is an tool that searches the response you give JUST reply with the search query Not EVEN LIKE here is the question.Nothing like that if you dont give in a line there will be no search result"+prompt, api_key)
    # Handle potential errors from get_gemini_response_text
    if search_query.startswith("Error"):
        print(f"Could not generate search query: {search_query}")
        return None # Indicate failure to generate query
    return search_query.strip()


# Robust parsing mechanism from matermind.py
def parse_response(response_text):
    if not isinstance(response_text, str):
        print(f"parse_response expected string, got {type(response_text)}")
        return {'reason': 'Invalid input type', 'tool': 'None'}

    response_text = response_text.strip()

    # 1. Try direct JSON parsing
    try:
        # Handle potential markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        # Replace single quotes with double quotes for better JSON compatibility
        response_text = response_text.replace("'", '"')
        # Attempt to fix common issues like trailing commas (basic attempt)
        response_text = re.sub(r",\s*([\}\]])", r"\1", response_text)
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass # Continue to next method

    # 2. Try ast.literal_eval (safer than eval)
    try:
        # ast.literal_eval requires keys and string values to be quoted
        # This is less reliable if the LLM doesn't use quotes correctly
        return ast.literal_eval(response_text)
    except (ValueError, SyntaxError, TypeError, MemoryError):
         pass # Continue to next method

    # 3. Try regex to extract JSON object (handles surrounding text)
    try:
        match = re.search(r'\{.*\}', response_text, re.DOTALL) # DOTALL allows . to match newlines
        if match:
            dict_str = match.group(0)
            # Try parsing the extracted string as JSON first, then literal_eval
            try:
                 # Replace single quotes for JSON
                 dict_str = dict_str.replace("'", '"')
                 # Attempt to fix common issues like trailing commas (basic attempt)
                 dict_str = re.sub(r",\s*([\}\]])", r"\1", dict_str)
                 return json.loads(dict_str)
            except json.JSONDecodeError:
                 try:
                      # literal_eval might work if JSON failed
                      return ast.literal_eval(dict_str)
                 except (ValueError, SyntaxError, TypeError, MemoryError):
                      pass # Failed to parse extracted string
    except Exception as e:
        print(f"Regex parsing error: {e}") # Log regex errors

    # 4. If all parsing methods fail
    print(f"Could not parse the response: {response_text}")
    # Default to 'None' tool if parsing fails completely
    return {'reason': 'Parsing failed, defaulting to chat.', 'tool': 'None'}


# --- Flask Routes ---

# --- Screenshot Handling ---
# Screenshot configuration
screenshot_dir = "static/screenshots"
latest_screenshot = None
screenshot_interval = 2  # seconds between screenshots

# Create screenshots directory if it doesn't exist
os.makedirs(screenshot_dir, exist_ok=True)

async def cleanup_screenshots():
    """Delete all screenshots except the latest one"""
    global latest_screenshot
    if latest_screenshot is None:
        return
    
    files = glob.glob(os.path.join(screenshot_dir, "screenshot_*.jpg"))
    files_to_delete = [f for f in files if f != latest_screenshot[0]]
    
    for file in files_to_delete:
        try:
            os.remove(file)
        except OSError as e:
            print(f"Error deleting screenshot {file}: {str(e)}")

@app.route('/screenshots', methods=['GET'])
def list_screenshots():
    """Returns a list of screenshot filenames."""
    files = glob.glob(os.path.join(screenshot_dir, "screenshot_*.jpg"))
    # Create a list of filenames relative to the static directory
    filenames = [os.path.basename(file) for file in files]
    return jsonify(filenames)

async def cleanup_screenshots():
    """Delete all screenshots except the latest one"""
    global latest_screenshot
    if latest_screenshot is None:
        return
    
    files = glob.glob(os.path.join(screenshot_dir, "screenshot_*.jpg"))
    files_to_delete = [f for f in files if f != latest_screenshot[0]]
    
    for file in files_to_delete:
        try:
            os.remove(file)
        except Exception as e:
            print(f"Error deleting screenshot {file}: {str(e)}")

async def periodic_screenshots(browser_context, stop_event):
    """Take screenshots at regular intervals"""
    while not stop_event.is_set():
        await capture_screenshot(browser_context)
        await asyncio.sleep(screenshot_interval)

async def capture_screenshot(browser_context):
    """Capture and encode a screenshot"""
    if not browser_context or not hasattr(browser_context, 'browser'):
        return None
        
    playwright_browser = browser_context.browser.playwright_browser
    
    if playwright_browser and playwright_browser.contexts:
        if len(playwright_browser.contexts) > 0:
            playwright_context = playwright_browser.contexts[0]
        else:
            return None
    else:
        return None

    if playwright_context:
        pages = playwright_context.pages

    if pages:
        active_page = pages[0]
        for page in pages:
            if page.url != "about:blank":
                active_page = page
    else:
        return None

    try:
        screenshot = await active_page.screenshot(
            type='jpeg',
            quality=75,
            scale="css"
        )
        encoded = base64.b64encode(screenshot).decode('utf-8')
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{screenshot_dir}/screenshot_{timestamp}.jpg"
        with open(filename, "wb") as f:
            f.write(screenshot)
            
        global latest_screenshot
        latest_screenshot = (filename, encoded)
        return encoded
    except Exception as e:
        print(f"Screenshot error: {str(e)}")
        return None

@app.route('/')
def index():
    return render_template('index.html', latest_screenshot=latest_screenshot)

# Serve static plot files
@app.route('/static/plots/<filename>')
def serve_plot(filename):
    return send_from_directory(app.config['PLOT_FOLDER'], filename)


@app.route('/determine_tool', methods=['POST'])
def determine_tool_route():
    data = request.json
    user_message = data.get('message')
    gemini_api_key = data.get('gemini_api_key')

    if not user_message or not gemini_api_key:
        return jsonify({'success': False, 'error': 'Missing message or API key'}), 400

    # Updated Prompt for Tool Determination including DataAnalysis
    tool_prompt = """You are an AI assistant that determines which tool should be used based on the user's message.
Respond ONLY with a JSON object in the specified format. Do NOT include markdown formatting like ```json ... ```.
Do NOT use single quotes, use double quotes for all strings in the JSON.

Available tools:
- Email: Use if the message explicitly mentions sending an email, includes an email address, or implies composing/replying to an email.
- BrowserUse: Use if the message asks to perform actions on the web, browse websites, extract information from a specific URL, or interact with web elements.
- DataAnalysis: Use if the message asks to analyze data, generate insights from data, perform calculations on data, or refers to an uploaded file (like CSV or Excel) for analysis.
- None: Use for general conversation, questions that don't require a specific tool, or if the user's intent is unclear. You have access to web search via the 'ai_search' endpoint even with 'None'.

Format your response EXACTLY like this:
{"reason": "Brief explanation for choosing the tool.", "tool": "Email|BrowserUse|DataAnalysis|None"}

User message: """

    # Use the specialized get_gemini_response expecting JSON-like output
    raw_response = get_gemini_response(tool_prompt + user_message, gemini_api_key)

    if raw_response.startswith("Error"):
         return jsonify({'success': False, 'error': raw_response}), 500

    parsed = parse_response(raw_response)

    # Validate the parsed tool value
    valid_tools = ["Email", "BrowserUse", "DataAnalysis", "None"]
    if parsed.get('tool') not in valid_tools:
        print(f"Invalid tool '{parsed.get('tool')}' received from LLM. Defaulting to 'None'. Raw: {raw_response}")
        parsed['tool'] = 'None'
        parsed['reason'] = parsed.get('reason', '') + " (Tool defaulted to None due to invalid value)"


    return jsonify({
        'success': True,
        'reason': parsed.get('reason', 'No reason provided'),
        'tool': parsed.get('tool', 'None') # Default to None if key missing
    })


@app.route('/send_email', methods=['POST'])
def send_email_route():
    data = request.json
    sender_email = data.get('sender_email')
    sender_password = data.get('sender_password')
    receiver_email = data.get('receiver_email')
    subject = data.get('subject')
    body = data.get('body')

    if not all([sender_email, sender_password, receiver_email, subject, body]):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    success, message = send_email(sender_email, sender_password, receiver_email, subject, body)
    return jsonify({'success': success, 'message': message})

@app.route('/generate_email', methods=['POST'])
def generate_email():
    data = request.json
    user_prompt = data.get('prompt')
    gemini_api_key = data.get('gemini_api_key')
    google_api_key = data.get('google_api_key')
    search_engine_id = data.get('search_engine_id')
    include_search = data.get('include_search', False)

    if not user_prompt or not gemini_api_key:
        return jsonify({'success': False, 'error': 'Missing prompt or API key'}), 400

    search_data_list = [] # Default to empty list
    if include_search and google_api_key and search_engine_id:
        search_query = relavent_search_query(user_prompt, gemini_api_key)
        print(f"Search query for email generation: {search_query}")
        if search_query:
            search_data_list = search_information(search_query, google_api_key, search_engine_id)
            # Handle search error string
            if isinstance(search_data_list, str) and search_data_list.startswith("Error"):
                 print(f"Search error during email generation: {search_data_list}")
                 # Proceed with generation but pass the error string for context
            elif not isinstance(search_data_list, list):
                 print(f"Unexpected search result type: {type(search_data_list)}")
                 search_data_list = [] # Reset to empty list if not error string or list


    subject, body = ai_generate(user_prompt, gemini_api_key, search_data_list)

    if subject.startswith("Error") or body.startswith("Error"):
         # Return error if generation failed
         return jsonify({'success': False, 'error': body}), 500

    return jsonify({'success': True, 'subject': subject, 'body': body})


@app.route('/search', methods=['POST'])
def search_route():
    data = request.json
    query = data.get('query')
    google_api_key = data.get('google_api_key')
    search_engine_id = data.get('search_engine_id')

    if not all([query, google_api_key, search_engine_id]):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    search_results = search_information(query, google_api_key, search_engine_id)

    # Check if search_information returned an error string
    if isinstance(search_results, str) and search_results.startswith("Error"):
        return jsonify({'success': False, 'error': search_results}), 500

    return jsonify({'success': True, 'results': search_results})


@app.route('/ai_search', methods=['POST'])
def ai_search_route():
    """Route that combines search with AI summarization."""
    query = request.form.get('query')
    gemini_api_key = request.form.get('gemini_api_key')
    google_api_key = request.form.get('google_api_key')
    search_engine_id = request.form.get('search_engine_id')
    use_search = request.form.get('useSearch', 'false').lower() == 'true' # Get search toggle state
    image_file = request.files.get('image')

    # Check required fields, note google_api_key and search_engine_id are only needed if use_search is true
    if not query or not gemini_api_key:
         return jsonify({'success': False, 'error': 'Missing query or Gemini API key'}), 400
    if use_search and (not google_api_key or not search_engine_id):
        return jsonify({'success': False, 'error': 'Missing Google API Key or Search Engine ID for Pro Search'}), 400


    # Prepare image data
    image_data = None
    if image_file:
        try:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            print(f"Error encoding image: {e}")
            return jsonify({'success': False, 'error': f'Error encoding image: {str(e)}'}), 400

    search_results = []
    search_results_for_json = []
    search_context = ""

    if use_search:
        # Perform search only if requested
        search_results = search_information(query, google_api_key, search_engine_id)

        # Handle search results or errors
        if isinstance(search_results, str) and search_results.startswith("Error"):
            print(f"Search error during AI Search: {search_results}")
            search_context = f"\n\nNote: There was an error retrieving search results: {search_results}\n"
            search_results_for_json = [] # Send empty list in JSON if search failed
        elif isinstance(search_results, list) and search_results:
            search_context = "\n\nHere are some search results to help you answer:\n"
            for item in search_results:
                search_context += f"- Title: {item.get('title', 'N/A')}\n  Link: {item.get('link', 'N/A')}\n  Snippet: {item.get('snippet', 'N/A')}\n"
            search_results_for_json = search_results # Use the actual results
        elif isinstance(search_results, list) and not search_results:
             search_context = "\n\nNote: No relevant search results were found.\n"
             search_results_for_json = []
        else:
            print(f"Unexpected search result type for AI Search: {type(search_results)}")
            search_context = "\n\nNote: An unexpected error occurred during search.\n"
            search_results_for_json = []
    else:
        # No search requested
        search_context = "\n\nNote: Web search was not used for this query.\n"
        search_results_for_json = []


    # Then, have Gemini analyze and summarize them
    prompt = f"""You are a helpful AI assistant that provides comprehensive answers.
The user asked: "{query}"
{search_context}
Based on the available information (and search results if provided), please provide a comprehensive answer to the user's query.
If search results were provided, include information from multiple sources when possible, and cite the sources when appropriate.
If search failed, returned no results, or was not used, answer based on your general knowledge.
Your answer should be well-structured, informative, and helpful.
"""
    if image_data:
        prompt += f"\n\nAlso, here is an image to consider: <image data='{image_data}'/>"

    # Use standard text generation
    response = get_gemini_response_text(prompt, gemini_api_key)

    if response.startswith("Error"):
         return jsonify({'success': False, 'error': response}), 500

    return jsonify({
        'success': True,
        'search_results': search_results_for_json, # Return list (empty if search failed or not used)
        'ai_response': response
    })

# New route for BrowserUse tool
@app.route('/browser_action', methods=['POST'])
async def browser_action_route():
    if not LANGCHAIN_AVAILABLE or not BrowserAgent or not ChatGoogleGenerativeAI:
        return jsonify({'success': False, 'error': 'BrowserUse tool is not configured or dependencies are missing.'}), 501 # Not Implemented
    
    data = request.json
    user_task = data.get('task')
    gemini_api_key = data.get('gemini_api_key')
    
    if not user_task or not gemini_api_key:
        return jsonify({'success': False, 'error': 'Missing task or API key for BrowserUse'}), 400
    
    try:
        # Import the necessary classes
        from browser_use import BrowserConfig, Browser
        from browser_use.browser.context import BrowserContextConfig, BrowserContext
        
        # Configure browser to run in headless mode
        browser_config = BrowserConfig(
            headless=True,  # Run in headless mode
            disable_security=True  # Keep default security setting
        )
        
        # Configure browser context with additional settings
        context_config = BrowserContextConfig(
            wait_for_network_idle_page_load_time=3.0,  # Increased wait time for better reliability
            browser_window_size={'width': 1280, 'height': 1100},
            highlight_elements=False,  # No need for highlights in headless mode
            viewport_expansion=500  # Default viewport expansion
        )
        
        # Initialize the browser and context
        browser = Browser(config=browser_config)
        browser_context = BrowserContext(browser=browser, config=context_config)
        
        # Configure the LLM
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_api_key)
        
        # Start periodic screenshots
        stop_event = asyncio.Event()
        screenshot_task = asyncio.create_task(periodic_screenshots(browser_context, stop_event))
        
        # Initialize the browser agent with the browser context
        agent = BrowserAgent(
            task=user_task,
            llm=llm,
            browser_context=browser_context
        )
        
        # Take initial screenshot
        await capture_screenshot(browser_context)
        
        # Run agent
        try:
            browser_result_obj = await agent.run()
        finally:
            # Stop periodic screenshots
            stop_event.set()
            await screenshot_task
            
            # Take final screenshot
            await capture_screenshot(browser_context)
            
            # Clean up screenshots
            await cleanup_screenshots()
        browser_result_str = str(browser_result_obj)
        
        # Prepare prompt for Gemini summarization
        summarization_prompt = f"""The user asked the browser agent to perform the following task:
"{user_task}"
The browser agent executed the task and produced the following detailed output:
--- BROWSER AGENT OUTPUT START ---
{browser_result_str}
--- BROWSER AGENT OUTPUT END ---
Based on the user's request and the browser agent's output, please provide a concise and user-friendly summary of what was done and the key information found. Focus on the final outcome and relevant data extracted. Avoid technical jargon from the agent's internal steps unless it's essential for understanding the result.
"""
        # Call Gemini to summarize
        final_summary = get_gemini_response_text(summarization_prompt, gemini_api_key)
        
        # Check for errors from Gemini
        if final_summary.startswith("Error"):
            print(f"Error summarizing browser result: {final_summary}")
            # Return the raw string result as a fallback if summarization fails
            return jsonify({'success': True, 'result': f"Browser action completed, but summarization failed. Raw output:\n{browser_result_str}"})
            
        return jsonify({'success': True, 'result': final_summary})
        
    except Exception as e:
        print(f"Error during browser action: {e}")
        # Include the original user task in the error message for context
        return jsonify({'success': False, 'error': f'Error executing browser task "{user_task}": {str(e)}'}), 500
# Removed DataAnalysis Tool Route (lines 578-667)


# Placeholder route for CSV tool (Kept for potential future use, distinct from DataAnalysis)
@app.route('/csv_action', methods=['POST'])
def csv_action_route():
    # TODO: Implement specific CSV generation/manipulation logic if needed
    data = request.json
    user_task = data.get('task') # Get task for CSV action
    print(f"CSV Action requested for task: {user_task}")
    # Example: Generate a CSV based on description, modify existing CSV structure etc.
    return jsonify({'success': False, 'message': 'CSV tool not yet implemented'}), 501 # Not Implemented


if __name__ == '__main__':
    # Use debug=False in production
    # Consider using a production-ready server like gunicorn or uvicorn
    # Example: gunicorn -w 4 backend:app
    app.run(debug=True, host='0.0.0.0', port=5000) # Run on port 5000