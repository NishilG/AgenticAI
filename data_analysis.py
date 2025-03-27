from flask import Flask, request, jsonify, send_from_directory, Blueprint
import pandas as pd
import io
from pathlib import Path
import os
from pandasai import Agent, Config
from pandasai.llms.google_gemini import GoogleGemini
from pandasai.smart_dataframe import SmartDataframe

data_analysis_bp = Blueprint('data_analysis', __name__)

PANDASAI_AVAILABLE = True # Assume available in separate file

# --- DataAnalysis Tool Route ---
@data_analysis_bp.route('/data_analysis_action', methods=['POST'])
def data_analysis_action():
    if not PANDASAI_AVAILABLE:
        return jsonify({'success': False, 'error': 'DataAnalysis tool is not available (pandasai library missing).'}), 501

    # Check if the post request has the file part and message part
    if 'file' not in request.files or 'message' not in request.form:
        return jsonify({'success': False, 'error': 'Missing file or message in request'}), 400

    file = request.files['file']
    query = request.form['message']
    gemini_api_key = request.form.get('gemini_api_key') # Get API key from form data

    if not gemini_api_key:
         # Fallback to environment variable if not in form
         gemini_api_key = os.getenv('GEMINI_API_KEY')
         if not gemini_api_key:
              return jsonify({'success': False, 'error': 'Missing Gemini API key'}), 400


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

            # Initialize PandasAI LLM (using GoogleGemini)
            llm = GoogleGemini(api_key=gemini_api_key,model="gemini-2.0-flash") # model="gemini-pro" is default

            # Configure PandasAI Agent
            # Note: Skipping custom middleware/parsers from Home.py for simplicity
            config = Config(
                llm=llm,
                verbose=True,
                enable_cache=False,
                # Ensure plots are saved
                save_charts=True,
                save_charts_path=os.path.join('static', 'plots') # Assuming static/plots is accessible
            )
            agent = Agent(df, config=config)

            # Run the chat query
            response = agent.chat(query)

            # Process the response
            if isinstance(response, SmartDataframe):
                # Convert dataframe to JSON serializable format (e.g., list of records)
                try:
                    # Handle potential large dataframes - maybe send head() or sample()
                    df_dict = response.dataframe.head(50).to_dict(orient='records') # Send first 50 rows
                    return jsonify({'success': True, 'type': 'dataframe', 'content': df_dict, 'filename': filename})
                except Exception as e:
                     print(f"Error converting dataframe to dict: {e}")
                     return jsonify({'success': True, 'type': 'text', 'content': f"Successfully processed query, but couldn't display dataframe preview. Error: {e}"})

            elif isinstance(response, dict) and response.get("type") == "plot" and response.get("value"):
                plot_path = response["value"]
                # Make the path relative to the static folder for URL generation
                relative_plot_path = os.path.relpath(plot_path, 'static') # Assuming static is accessible
                # Use forward slashes for URL
                url_plot_path = relative_plot_path.replace(os.sep, '/')
                return jsonify({'success': True, 'type': 'plot', 'content': url_plot_path}) # Send URL path

            elif isinstance(response, str):
                return jsonify({'success': True, 'type': 'text', 'content': response})
            else:
                # Handle unexpected response types
                print(f"Unexpected response type from pandasai: {type(response)}")
                return jsonify({'success': True, 'type': 'text', 'content': str(response)})

        except Exception as e:
            print(f"Error during data analysis: {e}")
            return jsonify({'success': False, 'error': f'Error during data analysis: {str(e)}'}), 500

    return jsonify({'success': False, 'error': 'File processing failed'}), 500