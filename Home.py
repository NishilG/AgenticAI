import os
import pandas as pd
from pandasai import SmartDataframe, Agent, Config
from langchain.chat_models import ChatOpenAI
from pandasai.callbacks import StdoutCallback
from pandasai.llm.langchain import LangchainLLM
from parser.response_parser import CustomResponseParser

def process_excel_file(file_path, prompt, model=None):
    """
    Process an Excel file with a given prompt using PandasAI.
    
    Args:
        file_path (str): Path to the Excel file
        prompt (str): User's query or instruction
        model (optional): LLM to use for analysis. Defaults to OpenAI.
    
    Returns:
        The response from the AI agent
    """
    # Read the Excel file
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return None

    # Use OpenAI as default LLM if no model is provided
    if model is None:
        model = LangchainLLM(ChatOpenAI(openai_api_key="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", openai_api_base='https://openrouter.ai/api/v1', model_name="openai/chatgpt-4o-latest"))

    # Configure PandasAI agent
    config = Config(
        llm=model,
        callback=StdoutCallback(),
        response_parser=CustomResponseParser,
        verbose=True
    )

    # Create an agent with the dataframe
    agent = Agent(df, config=config)

    # Process the prompt
    response = agent.chat(prompt)

    return response

def main():
    # Prompt for file path
    file_path = "/home/nishil/Downloads/test.xlsx"
    
    # Prompt for user query
    prompt = input("Enter your query or instruction: ")

    # Set API key if provided
    api_key = "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"
    if not api_key:
        api_key = input("Enter your OpenAI API key: ")
        os.environ['OPENAI_API_KEY'] = api_key

    # Process the file and prompt
    response = process_excel_file(file_path, prompt)

    # Handle different response types
    if response is None:
        print("Analysis failed.")
    elif isinstance(response, pd.DataFrame):
        print("\nResult DataFrame:")
        print(response)
        # Optional: Save to CSV
        response.to_csv('output.csv', index=False)
        print("\nDataFrame also saved to 'output.csv'")
    else:
        print("\nResponse:", response)

if __name__ == '__main__':
    main()