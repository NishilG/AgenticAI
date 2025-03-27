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
app = Flask(__name__, static_folder='None')
CORS(app)  # Enable CORS for all routes

PANDASAI_AVAILABLE = True

# Create directories if they don't exist
os.makedirs('uploads', exist_ok=True)
os.makedirs(os.path.join('None', 'streamlit'), exist_ok=True)

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
        openai_api_key = "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"
        if not openai_api_key:
            return jsonify({'success': False, 'error': 'Missing OpenAI API key'}), 400

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

            llm = LangchainLLM(ChatOpenAI(openai_api_key=openai_api_key,openai_api_base='https://openrouter.ai/api/v1',model_name="openai/chatgpt-4o-latest"))
            config = Config(
                llm=llm,
                callback=StdoutCallback(),
                response_parser=CustomResponseParser,
                verbose=True,
                enable_cache=False,
                save_charts=True,
                save_charts_path="static/plots"
            )
            agent = Agent(df, config=config)
            # Validate query first
            if not query or not isinstance(query, str):
                return jsonify({'success': False, 'error': 'Invalid query - must be a non-empty string'}), 400

            response = agent.chat(query)
            sleep(2)
            print(f"PandasAI response for query '{query}':", response)
            
            if response is None:
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
                plot_url = "/None/streamlit/" + os.path.basename(plot_path)
                print(f"Plot URL: {plot_url}")
                return jsonify({
                    'success': True,
                    'type': 'plot',
                    'content': plot_url
                })

            elif response is None:
                return jsonify({
                    'success': False,
                    'error': 'No response generated from analysis'
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