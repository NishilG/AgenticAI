from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import io
from pathlib import Path
import os
import base64
import matplotlib
matplotlib.use('Agg')  # Set non-GUI backend to avoid thread warnings
from pandasai import Agent, Config
from pandasai.llm import LangchainLLM
from langchain.chat_models import ChatOpenAI
from pandasai.smart_dataframe import SmartDataframe
from parser.response_parser import CustomResponseParser
from pandasai.callbacks import StdoutCallback
from time import sleep
app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for all routes
import json
PANDASAI_AVAILABLE = True

# Create directories if they don't exist
os.makedirs('uploads', exist_ok=True)
os.makedirs('static/plots', exist_ok=True)  # Only need plots directory for saving charts

@app.route('/data_analysis_action', methods=['POST'])
def data_analysis_action():
    if not PANDASAI_AVAILABLE:
        return jsonify({'success': False, 'error': 'DataAnalysis tool is not available (pandasai library missing).'}), 501

    if 'file' not in request.files or 'message' not in request.form:
        return jsonify({'success': False, 'error': 'Missing file or message in request'}), 400

    file = request.files['file']
    query = request.form['message']
    openai_api_key = "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"
    
    if not openai_api_key:
        return jsonify({'success': False, 'error': 'Missing OpenAI API key. Please set OPENAI_API_KEY environment variable.'}), 400

    if 'chat_history' in request.form:
        chat_history_str = request.form['chat_history']
        try:
            chat_history = json.loads(chat_history_str)
        except json.JSONDecodeError:
            print("Invalid chat history format, defaulting to empty list")
            chat_history = []
    else:
        chat_history = []

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    if file:
        try:
            filename = file.filename
            file_ext = Path(filename).suffix.lower()
            file_stream = io.BytesIO(file.read())

            df = None
            if file_ext == ".csv":
                df = pd.read_csv(file_stream)
            elif file_ext in [".xlsx", ".xls"]:
                df = pd.read_excel(file_stream)
            else:
                return jsonify({'success': False, 'error': 'Unsupported file type. Please upload CSV or Excel.'}), 400

            if df is None or df.empty:
                return jsonify({'success': False, 'error': 'Could not read or file is empty.'}), 400

            llm = LangchainLLM(ChatOpenAI(openai_api_key=openai_api_key,openai_api_base="https://openrouter.ai/api/v1", model_name="openai/chatgpt-4o-latest"))
            config = Config(
                llm=llm,
                callback=StdoutCallback(),
                response_parser=CustomResponseParser,
                verbose=True,
                enable_cache=False,
                save_charts=True,
                # Use absolute path for saving charts
                save_charts_path=os.path.join(os.getcwd(), "static", "plots").replace("\\", "/")
            )
            agent = Agent(df, config=config)
            # Validate query first
            if not query or not isinstance(query, str):
                return jsonify({'success': False, 'error': 'Invalid query - must be a non-empty string'}), 400

            # Incorporate chat history into the query
            if chat_history:
                history_str = "\n\nChat History:\n"
                for msg in chat_history:
                    history_str += f"- {msg['role']}: {msg['content']}\n"
                query_with_history = history_str + query # Use a different variable to keep original query for logging if needed
            else:
                query_with_history = query

            response = None
            try:
                print(f"Attempting PandasAI chat with query: {query_with_history[:200]}...") # Log start, truncate long queries
                response = agent.chat(query_with_history)
                sleep(2) # Keep sleep for now, might be related to async operations finishing?
                print(f"PandasAI raw response type: {type(response)}")
                print(f"PandasAI raw response content: {str(response)[:500]}") # Log response snippet

            except Exception as chat_error:
                # Log the specific error during the chat call
                print(f"!!! Error during agent.chat: {type(chat_error).__name__}: {chat_error}")
                # Check if it looks like a network error (common libraries raise subclasses of OSError or specific exceptions)
                # This is a heuristic check
                if "fetch" in str(chat_error).lower() or "connection" in str(chat_error).lower() or "network" in str(chat_error).lower():
                     return jsonify({'success': False, 'error': f'Failed to fetch response from analysis API: {str(chat_error)}'}), 502 # Bad Gateway might be appropriate
                else:
                     return jsonify({'success': False, 'error': f'Error during data analysis execution: {str(chat_error)}'}), 500


            if response is None:
                print("PandasAI returned None response.")
                return jsonify({
                    'success': False,
                    'error': 'Analysis returned no result - try rephrasing your query'
                })

            elif isinstance(response, SmartDataframe):
                try:
                    df_dict = response.dataframe.head(50).to_dict(orient='records')
                    # Convert NaN values to None before JSON serialization
                    for row in df_dict:
                        for key, value in row.items():
                            if isinstance(value, float) and pd.isna(value):
                                row[key] = None
                    response = jsonify({
                        'success': True,
                        'type': 'dataframe',
                        'content': df_dict,
                        'filename': filename
                    })
                    response.headers['Content-Type'] = 'application/json'
                    return response
                except Exception as e:
                    print(f"Error converting dataframe to dict: {e}")
                    return jsonify({'success': True, 'type': 'text', 'content': f"Successfully processed query, but couldn't display dataframe preview. Error: {e}"})

            elif isinstance(response, dict) and response.get("type") == "plot" and response.get("value"):
        # Plot response handling
                plot_path = response["value"]
                plot_url = f"/static/plots/{os.path.basename(plot_path)}".replace("\\", "/")
                print(f"Plot URL: {plot_url}")
                return jsonify({
                    'success': True,
                    'type': 'plot',
                    'content': plot_url
                })

            elif isinstance(response, str):
                return jsonify({'success': True, 'type': 'text', 'content': response})
            else:
                print(f"Unexpected response type from pandasai: {type(response)}")
                return jsonify({'success': True, 'type': 'text', 'content': str(response)})

        except Exception as e:
            print(f"Error during data analysis: {e}")
            return jsonify({'success': False, 'error': f'Error during data analysis: {str(e)}'}), 500

    return jsonify({'success': False, 'error': 'File processing failed'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)