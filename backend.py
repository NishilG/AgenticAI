# Merged backend.py - Incorporating features from main.py

import asyncio
import base64
import datetime
import glob
import json
import os
import re
import smtplib
import ast
from datetime import datetime
from email.message import EmailMessage

import requests
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, send_from_directory

# Original Manus imports (from main.py)
from app.agent.manus import Manus
from app.logger import logger # Assuming logger is configured similarly

# Attempt to import browser_use components, handle potential ImportError
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from browser_use import Agent as BrowserAgent # Renamed to avoid conflict
    from browser_use import BrowserConfig, Browser # Added from main.py
    from browser_use.browser.context import BrowserContextConfig, BrowserContext # Added from main.py
    LANGCHAIN_AVAILABLE = True
except ImportError:
    logger.warning("Warning: browser_use or langchain_google_genai not found. BrowserUse tool will not function.") # Use logger
    ChatGoogleGenerativeAI = None
    BrowserAgent = None
    BrowserConfig = None # Added from main.py
    Browser = None # Added from main.py
    BrowserContextConfig = None # Added from main.py
    BrowserContext = None # Added from main.py
    LANGCHAIN_AVAILABLE = False

# Load environment variables
load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')

# Disable caching for development (optional, kept from original backend.py)
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
STATIC_FOLDER = 'static'
PLOT_FOLDER = os.path.join(STATIC_FOLDER, 'plots')
SCREENSHOT_DIR = os.path.join(STATIC_FOLDER, 'screenshots') # Added from main.py
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PLOT_FOLDER, exist_ok=True)
os.makedirs(SCREENSHOT_DIR, exist_ok=True) # Added from main.py
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PLOT_FOLDER'] = PLOT_FOLDER
app.config['SCREENSHOT_DIR'] = SCREENSHOT_DIR # Added from main.py

# --- Global Variables for Screenshots --- (from main.py)
latest_screenshot = None
screenshot_interval = 2  # seconds between screenshots

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
        logger.error(f"Error sending email: {e}") # Use logger
        return False, f"Error sending email: {e}"

def get_gemini_response(prompt, gemini_api_key):
    """Uses Gemini API to get a response based on the prompt using REST API (expects JSON-like)."""
    # Using 1.5 Pro as it might be better for structured output (from main.py logic)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key={gemini_api_key}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ],
        "generationConfig": {
             "response_mime_type": "application/json",
             "temperature": 0.3
        }
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()
        response_json = response.json()

        if not response_json.get('candidates'):
             finish_reason = response_json.get('promptFeedback', {}).get('blockReason')
             if finish_reason:
                 logger.error(f"Gemini request blocked: {finish_reason}")
                 return f"Error: Response blocked by API ({finish_reason})"
             else:
                 logger.error(f"Gemini response missing candidates: {response_json}")
                 return "Error: Invalid response from Gemini API (No candidates)"

        try:
            content = response_json['candidates'][0]['content']
            if 'parts' in content and content['parts']:
                 if 'text' in content['parts'][0]:
                      return content['parts'][0]['text']
                 else:
                      logger.error(f"Gemini response part is not text: {content['parts'][0]}")
                      return "Error: Unexpected response format from Gemini (Part not text)"
            else:
                 logger.error(f"Gemini response missing parts: {content}")
                 return "Error: Invalid response format from Gemini (Missing parts)"
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"Error parsing Gemini response structure: {e}\nResponse: {response_json}")
            return f"Error: Could not parse Gemini response ({e})"

    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Gemini API: {e}")
        return f"Error connecting to Gemini API: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error in get_gemini_response: {e}")
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
             logger.warning(f"No search results found for query: {query}")

        return search_data

    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Google Search API: {e}")
        return f"Error connecting to Google Search API: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error in search_information: {e}")
        return f"Unexpected error during search: {str(e)}"

def get_gemini_response_text(prompt, gemini_api_key):
     """Gets standard text response from Gemini, similar to original get_gemini_response but without JSON expectation."""
     # Using 1.5 Pro (from main.py)
     url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key={gemini_api_key}"
     headers = {'Content-Type': 'application/json'}
     data = {
         "contents": [{"parts": [{"text": prompt}]}],
         "safetySettings": [
             {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
             {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
             {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
             {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
         ],
         "generationConfig": {
             "temperature": 0.7,
             "maxOutputTokens": 1500
         }
     }
     try:
         response = requests.post(url, headers=headers, data=json.dumps(data))
         response.raise_for_status()
         response_json = response.json()

         if not response_json.get('candidates'):
             finish_reason = response_json.get('promptFeedback', {}).get('blockReason')
             if finish_reason:
                 logger.error(f"Gemini text request blocked: {finish_reason}")
                 return f"Error: Response blocked by API ({finish_reason})"
             else:
                 logger.error(f"Gemini text response missing candidates: {response_json}")
                 return "Error: Invalid response from Gemini API (No candidates)"

         try:
             content = response_json['candidates'][0]['content']
             if 'parts' in content and content['parts'] and 'text' in content['parts'][0]:
                 return content['parts'][0]['text']
             else:
                 logger.error(f"Gemini text response missing parts/text: {content}")
                 return "Error: Invalid response format from Gemini (Missing parts/text)"
         except (KeyError, IndexError, TypeError) as e:
             logger.error(f"Error parsing Gemini text response structure: {e}\nResponse: {response_json}")
             return f"Error: Could not parse Gemini text response ({e})"

     except requests.exceptions.RequestException as e:
         logger.error(f"Error connecting to Gemini API for text: {e}")
         return f"Error connecting to Gemini API: {str(e)}"
     except Exception as e:
         logger.error(f"Unexpected error in get_gemini_response_text: {e}")
         return f"Unexpected error: {str(e)}"

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
         search_context += f"\n\nNote: There was an error during information search: {search_data_list}\n"

    # Generate email body
    body_prompt = gemini_prompt + search_context + "\n\nUser request: " + input_text
    body = get_gemini_response_text(body_prompt, gemini_api_key)

    if body.startswith("Error"):
        return "Error", body

    # Generate subject line
    subject_prompt = f"Generate a concise and relevant one subject line for this email and nothing else dont ask questions or give multiple options: {body}"
    subject = get_gemini_response_text(subject_prompt, gemini_api_key)

    if subject.startswith("Error"):
        return "Error generating subject", body

    # Remove any quotes or extra formatting from subject
    subject = subject.strip().strip('"').strip("'")

    return subject, body

def relavent_search_query(prompt, api_key):
    search_query = get_gemini_response_text("There is an tool that searches the response you give JUST reply with the search query Not EVEN LIKE here is the question.Nothing like that if you dont give in a line there will be no search result"+prompt, api_key)
    if search_query.startswith("Error"):
        logger.error(f"Could not generate search query: {search_query}")
        return None
    return search_query.strip()

# Robust parsing mechanism (from main.py / backend.py)
def parse_response(response_text):
    if not isinstance(response_text, str):
        logger.warning(f"parse_response expected string, got {type(response_text)}")
        return {'reason': 'Invalid input type', 'tool': 'None'}

    response_text = response_text.strip()

    # 1. Try direct JSON parsing
    try:
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        response_text = response_text.replace("'", '"')
        response_text = re.sub(r",\s*([\}\]])", r"\1", response_text)
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass

    # 2. Try ast.literal_eval
    try:
        return ast.literal_eval(response_text)
    except (ValueError, SyntaxError, TypeError, MemoryError):
         pass

    # 3. Try regex to extract JSON object
    try:
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            dict_str = match.group(0)
            try:
                 dict_str = dict_str.replace("'", '"')
                 dict_str = re.sub(r",\s*([\}\]])", r"\1", dict_str)
                 return json.loads(dict_str)
            except json.JSONDecodeError:
                 try:
                      return ast.literal_eval(dict_str)
                 except (ValueError, SyntaxError, TypeError, MemoryError):
                      pass
    except Exception as e:
        logger.error(f"Regex parsing error: {e}")

    # 4. If all parsing methods fail
    logger.warning(f"Could not parse the response: {response_text}")
    return {'reason': 'Parsing failed, defaulting to chat.', 'tool': 'None'}

# --- Screenshot Handling --- (from main.py)

async def cleanup_screenshots():
    """Delete all screenshots except the latest one"""
    global latest_screenshot
    if latest_screenshot is None:
        return

    files = glob.glob(os.path.join(app.config['SCREENSHOT_DIR'], "screenshot_*.jpg"))
    files_to_delete = [f for f in files if f != latest_screenshot[0]]

    for file in files_to_delete:
        try:
            os.remove(file)
        except OSError as e:
            logger.error(f"Error deleting screenshot {file}: {str(e)}")

async def periodic_screenshots(browser_context, stop_event):
    """Take screenshots at regular intervals"""
    while not stop_event.is_set():
        await capture_screenshot(browser_context)
        await asyncio.sleep(screenshot_interval)

async def capture_screenshot(browser_context):
    """Capture and encode a screenshot"""
    global latest_screenshot
    if not browser_context or not hasattr(browser_context, 'browser'):
        logger.warning("capture_screenshot: Browser context not available.")
        return None

    playwright_browser = browser_context.browser.playwright_browser

    if not playwright_browser or not playwright_browser.contexts:
        logger.warning("capture_screenshot: Playwright browser or contexts not available.")
        return None

    if len(playwright_browser.contexts) == 0:
        logger.warning("capture_screenshot: No Playwright contexts found.")
        return None

    playwright_context = playwright_browser.contexts[0]

    if not playwright_context or not playwright_context.pages:
        logger.warning("capture_screenshot: Playwright context or pages not available.")
        return None

    active_page = None
    for page in playwright_context.pages:
        if page.url != "about:blank":
            active_page = page
            break

    if not active_page:
        if playwright_context.pages:
            active_page = playwright_context.pages[0]
        else:
            logger.warning("capture_screenshot: No pages found in context.")
            return None

    try:
        screenshot = await active_page.screenshot(
            type='jpeg',
            quality=75,
            scale="css"
        )
        encoded = base64.b64encode(screenshot).decode('utf-8')

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = os.path.join(app.config['SCREENSHOT_DIR'], f"screenshot_{timestamp}.jpg")
        with open(filename, "wb") as f:
            f.write(screenshot)

        latest_screenshot = (filename, encoded)
        return encoded
    except Exception as e:
        logger.error(f"Screenshot error on page {active_page.url}: {str(e)}")
        return None

# --- Flask Routes ---

@app.route('/')
def index():
    # Pass the latest screenshot *path* relative to static folder if available (from main.py)
    latest_screenshot_path = None
    if latest_screenshot:
        # Ensure the path is relative to the static folder for the template
        try:
            latest_screenshot_path = os.path.relpath(latest_screenshot[0], app.static_folder)
            # Replace backslashes with forward slashes for web paths
            latest_screenshot_path = latest_screenshot_path.replace(os.path.sep, '/')
        except ValueError:
             logger.error(f"Could not create relative path for screenshot: {latest_screenshot[0]} from {app.static_folder}")
             latest_screenshot_path = None # Fallback if paths are on different drives

    return render_template('index.html', latest_screenshot=latest_screenshot_path)


# Serve static plot files
@app.route('/static/plots/<filename>')
def serve_plot(filename):
    return send_from_directory(app.config['PLOT_FOLDER'], filename)

# Serve static screenshot files (from main.py)
@app.route('/static/screenshots/<filename>')
def serve_screenshot(filename):
    return send_from_directory(app.config['SCREENSHOT_DIR'], filename)

@app.route('/screenshots', methods=['GET'])
def list_screenshots():
    """Returns a list of screenshot filenames relative to static/screenshots."""
    try:
        files = glob.glob(os.path.join(app.config['SCREENSHOT_DIR'], "screenshot_*.jpg"))
        # Sort by modification time, newest first
        files.sort(key=lambda f: os.path.getmtime(f), reverse=True)
        # Get just the filenames
        filenames = [os.path.basename(file) for file in files]
        return jsonify(filenames)
    except Exception as e:
        logger.error(f"Error listing screenshots: {e}")
        return jsonify({"error": "Failed to list screenshots"}), 500


@app.route('/determine_tool', methods=['POST'])
def determine_tool_route():
    data = request.json
    user_message = data.get('message')
    gemini_api_key = data.get('gemini_api_key')
    chat_history_data = data.get('chat_history', []) # Get chat history data (assuming it's already a list/object from JSON)
    chat_history = [] # Initialize chat_history
    if isinstance(chat_history_data, list): # Basic validation
        chat_history = chat_history_data
    else:
        logger.warning("Invalid chat history format received in determine_tool, expected list.")

    if not user_message or not gemini_api_key:
        return jsonify({'success': False, 'error': 'Missing message or API key'}), 400

    # Updated Prompt for Tool Determination including Manus
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
#Manus|- Manus: Use if the message asks to perform complex software development tasks, code generation, refactoring, file creation, Deep research, debugging, or project planning that goes beyond simple chat or web browsing/data analysis. Examples: "Refactor this Python code", "Write a React component for...", "Plan the architecture for a new microservice", "Debug this error in my script".
    # Add chat history context if needed
    chat_context = ""
    if chat_history:
        chat_context += "\n\nHere is the recent chat history:\n"
        for msg in chat_history:
            chat_context += f"- {msg['role']}: {msg['content']}\n"
    full_prompt = tool_prompt + chat_context + "\n" + user_message

    #full_prompt = tool_prompt + user_message # Simplified prompt without history for now

    raw_response = get_gemini_response(full_prompt, gemini_api_key)

    if raw_response.startswith("Error"):
         return jsonify({'success': False, 'error': raw_response}), 500

    parsed = parse_response(raw_response)

    # Validate the parsed tool value including Manus
    valid_tools = ["Email", "BrowserUse", "DataAnalysis", "Manus", "None"]
    if parsed.get('tool') not in valid_tools:
        logger.warning(f"Invalid tool '{parsed.get('tool')}' received from LLM. Defaulting to 'None'. Raw: {raw_response}")
        parsed['tool'] = 'None'
        parsed['reason'] = parsed.get('reason', '') + " (Tool defaulted to None due to invalid value)"

    return jsonify({
        'success': True,
        'reason': parsed.get('reason', 'No reason provided'),
        'tool': parsed.get('tool', 'None')
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
    chat_history = data.get('chat_history', []) # Keep if ai_generate uses it

    if not user_prompt or not gemini_api_key:
        return jsonify({'success': False, 'error': 'Missing prompt or API key'}), 400

    search_data_list = []
    if include_search and google_api_key and search_engine_id:
        search_query = relavent_search_query(user_prompt, gemini_api_key)
        logger.info(f"Search query for email generation: {search_query}")
        if search_query:
            search_data_list = search_information(search_query, google_api_key, search_engine_id)
            if isinstance(search_data_list, str) and search_data_list.startswith("Error"):
                 logger.warning(f"Search error during email generation: {search_data_list}")
            elif not isinstance(search_data_list, list):
                 logger.error(f"Unexpected search result type: {type(search_data_list)}")
                 search_data_list = []

    subject, body = ai_generate(user_prompt, gemini_api_key, search_data_list)

    if subject.startswith("Error") or body.startswith("Error"):
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

    if isinstance(search_results, str) and search_results.startswith("Error"):
        return jsonify({'success': False, 'error': search_results}), 500

    return jsonify({'success': True, 'results': search_results})


@app.route('/ai_search', methods=['POST'])
def ai_search_route():
    """Route that combines search with AI summarization."""
    # Use request.form for multipart/form-data
    query = request.form.get('query')
    gemini_api_key = request.form.get('gemini_api_key')
    google_api_key = request.form.get('google_api_key')
    search_engine_id = request.form.get('search_engine_id')
    use_search = request.form.get('useSearch', 'false').lower() == 'true'
    image_file = request.files.get('image')
    chat_history_str = request.form.get('chat_history', '[]') # Get chat history string
    chat_history = [] # Initialize chat_history to prevent NameError
    try:
        chat_history = json.loads(chat_history_str) # Attempt to parse
    except json.JSONDecodeError:
        logger.warning("Invalid chat history format received in ai_search, using empty list.")
        chat_history = [] # Ensure chat_history remains an empty list on error
    #     logger.warning("Invalid chat history format received in ai_search")
    #     chat_history = []

    if not query or not gemini_api_key:
         return jsonify({'success': False, 'error': 'Missing query or Gemini API key'}), 400
    if use_search and (not google_api_key or not search_engine_id):
        return jsonify({'success': False, 'error': 'Missing Google API Key or Search Engine ID for Pro Search'}), 400

    image_data = None
    if image_file:
        try:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Error encoding image: {e}")
            return jsonify({'success': False, 'error': f'Error encoding image: {str(e)}'}), 400

    search_results = []
    search_results_for_json = []
    search_context = ""

    if use_search:
        search_results = search_information(query, google_api_key, search_engine_id)

        if isinstance(search_results, str) and search_results.startswith("Error"):
            logger.warning(f"Search error during AI Search: {search_results}")
            search_context = f"\n\nNote: There was an error retrieving search results: {search_results}\n"
            search_results_for_json = []
        elif isinstance(search_results, list) and search_results:
            search_context = "\n\nHere are some search results to help you answer:\n"
            for item in search_results:
                search_context += f"- Title: {item.get('title', 'N/A')}\n  Link: {item.get('link', 'N/A')}\n  Snippet: {item.get('snippet', 'N/A')}\n"
            search_results_for_json = search_results
        elif isinstance(search_results, list) and not search_results:
             search_context = "\n\nNote: No relevant search results were found.\n"
             search_results_for_json = []
        else:
            logger.error(f"Unexpected search result type for AI Search: {type(search_results)}")
            search_context = "\n\nNote: An unexpected error occurred during search.\n"
            search_results_for_json = []
    else:
        search_context = "\n\nNote: Web search was not used for this query.\n"
        search_results_for_json = []

    #Add chat history context if needed
    chat_context_str = ""
    if chat_history:
        chat_context_str += "\n\nHere is the recent chat history:\n"
        for msg in chat_history:
            chat_context_str += f"- {msg['role']}: {msg['content']}\n"

    prompt = f"""You are a helpful AI assistant that provides comprehensive answers.
The user asked: "{query}"
{search_context}
Based on the available information (and search results if provided), please provide a comprehensive answer to the user's query.
If search results were provided, include information from multiple sources when possible, and cite the sources when appropriate.
If search failed, returned no results, or was not used, answer based on your general knowledge.
Your answer should be well-structured, informative, and helpful.
"""
    if image_data:
        # Gemini Pro Vision expects image data differently than text prompt
        # This part needs adjustment based on how Gemini Vision API handles combined text/image prompts via REST
        # For now, just mentioning the image in the text prompt.
        # A more robust solution might involve sending separate parts for text and image.
        prompt += f"\n\nAlso, consider the provided image."
        logger.warning("Image data provided to /ai_search, but direct Gemini Vision API call structure might be needed for optimal handling.")


    response = get_gemini_response_text(prompt, gemini_api_key)

    if response.startswith("Error"):
         return jsonify({'success': False, 'error': response}), 500

    return jsonify({
        'success': True,
        'search_results': search_results_for_json,
        'ai_response': response
    })

# Browser Action route from main.py (includes screenshot logic)
@app.route('/browser_action', methods=['POST'])
async def browser_action_route():
    if not LANGCHAIN_AVAILABLE:
        return jsonify({'success': False, 'error': 'BrowserUse tool is not configured or dependencies are missing.'}), 501

    data = request.json
    user_task = data.get('task')
    gemini_api_key = data.get('gemini_api_key')
    chat_history = data.get('chat_history', []) # Keep if needed for summarization prompt

    if not user_task or not gemini_api_key:
        return jsonify({'success': False, 'error': 'Missing task or API key for BrowserUse'}), 400

    browser_context = None
    screenshot_task = None
    stop_event = asyncio.Event()
    browser = None # Initialize browser variable

    try:
        browser_config = BrowserConfig(
            headless=True,
            disable_security=True # As per main.py
        )

        context_config = BrowserContextConfig(
            wait_for_network_idle_page_load_time=3.0,
            browser_window_size={'width': 1280, 'height': 1100},
            highlight_elements=False,
            viewport_expansion=500
        )

        browser = Browser(config=browser_config) # Assign to browser variable
        browser_context = BrowserContext(browser=browser, config=context_config)

        # Use 1.5 Pro as per main.py
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro-latest", google_api_key=gemini_api_key)

        # Start periodic screenshots
        screenshot_task = asyncio.create_task(periodic_screenshots(browser_context, stop_event))

        agent = BrowserAgent(
            task=user_task,
            llm=llm,
            browser_context=browser_context
        )

        # Capture initial screenshot
        await capture_screenshot(browser_context)

        # Run agent
        browser_result_obj = await agent.run()

        # Summarization (using get_gemini_response_text as per main.py)
        summarization_prompt = f"""The user asked the browser agent to perform the following task:
"{user_task}"
The browser agent executed the task and produced the following detailed output:
--- BROWSER AGENT OUTPUT START ---
{str(browser_result_obj)}
--- BROWSER AGENT OUTPUT END ---
Based on the user's request and the browser agent's output, please provide a concise and user-friendly summary of what was done and the key information found. Focus on the final outcome and relevant data extracted. Avoid technical jargon from the agent's internal steps unless it's essential for understanding the result.
"""
        final_summary = get_gemini_response_text(summarization_prompt, gemini_api_key)

        if final_summary.startswith("Error"):
            logger.error(f"Error summarizing browser result: {final_summary}")
            # Fallback to raw result if summarization fails
            return jsonify({'success': True, 'result': f"Browser action completed, but summarization failed. Raw output:\n{str(browser_result_obj)}"})

        return jsonify({'success': True, 'result': final_summary})

    except Exception as e:
        logger.error(f"Error during browser action: {e}", exc_info=True)
        return jsonify({'success': False, 'error': f'Error executing browser task "{user_task}": {str(e)}'}), 500
    finally:
        # Stop and await screenshot task
        stop_event.set()
        if screenshot_task:
            try:
                await screenshot_task
            except asyncio.CancelledError:
                logger.info("Screenshot task cancelled.")
            except Exception as e:
                logger.error(f"Error during screenshot task finalization: {e}")

        # Capture final screenshot before closing
        if browser_context:
            await capture_screenshot(browser_context)
            try:
                await browser_context.close()
                logger.info("Browser context closed.")
            except Exception as e:
                logger.error(f"Error closing browser context: {e}")

        # Close the browser itself if it was initialized
        if browser:
             try:
                await browser.close()
                logger.info("Browser closed.")
             except Exception as e:
                logger.error(f"Error closing browser: {e}")

        # Cleanup screenshots (delete old ones)
        await cleanup_screenshots()


# Placeholder route for CSV tool
@app.route('/csv_action', methods=['POST'])
def csv_action_route():
    data = request.json
    user_task = data.get('task')
    logger.info(f"CSV Action requested for task: {user_task}")
    # Placeholder - Implement actual CSV logic here if needed separately from DataAnalysis
    return jsonify({'success': False, 'message': 'CSV tool not yet implemented'}), 501

# Manus Agent Route (from main.py)
@app.route('/api/run_manus', methods=['POST'])
async def run_manus_route():
    """Runs the Manus agent with a given prompt."""
    data = request.json
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({'success': False, 'error': 'Missing prompt'}), 400

    agent = None
    try:
        logger.info(f"Received Manus request with prompt: {prompt[:100]}...")
        agent = Manus()
        await agent.run(prompt)
        logger.info("Manus agent processing completed.")
        # Consider returning more specific success message or result if Manus provides one
        return jsonify({'success': True, 'message': 'Manus agent ran successfully.'})

    except Exception as e:
        logger.error(f"Error running Manus agent: {e}", exc_info=True)
        return jsonify({'success': False, 'error': f'Error running Manus agent: {str(e)}'}), 500
    finally:
        if agent:
            try:
                await agent.cleanup()
                logger.info("Manus agent resources cleaned up.")
            except Exception as e:
                logger.error(f"Error cleaning up Manus agent: {e}")


# Generate Title Route (kept from original backend.py)
@app.route('/generate_title', methods=['POST'])
def generate_title_route():
    data = request.json
    messages = data.get('messages')
    gemini_api_key = data.get('gemini_api_key')

    if not messages or not gemini_api_key:
        return jsonify({'success': False, 'error': 'Missing messages or Gemini API key'}), 400

    prompt_messages = []
    for msg in messages[:4]: # Limit to first 4 messages
        role = msg.get('role', 'unknown').capitalize()
        content = msg.get('content', '')
        if len(content) > 150:
            content = content[:150] + "..."
        prompt_messages.append(f"{role}: {content}")

    conversation_summary = "\n".join(prompt_messages)

    title_prompt = f"""Based on the following conversation snippet, generate a very short, concise title (3-5 words maximum) that captures the main topic. Do not add any extra explanation or formatting. Just provide the title text.

Conversation Snippet:
---
{conversation_summary}
---

Short Title:"""

    generated_title = get_gemini_response_text(title_prompt, gemini_api_key)

    if generated_title.startswith("Error"):
        logger.error(f"Error generating title: {generated_title}")
        fallback_title = "Chat"
        if messages and messages[0].get('content'):
             fallback_title = ' '.join(messages[0]['content'].split()[:5])
        return jsonify({'success': False, 'error': generated_title, 'title': fallback_title})

    cleaned_title = generated_title.strip().strip('"').strip("'")
    cleaned_title = ' '.join(cleaned_title.split()[:7]) # Limit words as safeguard

    return jsonify({'success': True, 'title': cleaned_title})


if __name__ == '__main__':
    logger.info("Starting Flask server...") # Use logger
    # Run on 0.0.0.0 to be accessible externally if needed, port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)