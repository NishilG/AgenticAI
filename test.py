import io
import os
from pathlib import Path

import pandas as pd
from pandasai import Agent, SmartDataframe
from pandasai import Config
from pandasai.llm.langchain import LangchainLLM
from langchain.chat_models import ChatOpenAI
from pandasai.prompts import GeneratePythonCodePrompt
from pandasai.callbacks import StdoutCallback
def get_prompt_template():
    instruction_template = """
使用提供的 dataframes ('dfs') 分析这个数据，过程中不要调用 dataframe set_index 对数据排序.
1. 准备: 如果有必要对数据做预处理和清洗
2. 执行: 对数据进行数据分析操作 (grouping, filtering, aggregating, etc.)
3. 分析: 进行实际分析（如果用户要求plot chart，请在代码中添加如下两行代码设置字体, 并将结果保存为图像文件temp_chart.png，并且不显示图表）
plt.rcParams['font.sans-serif']=['SimHei']
plt.rcParams['axes.unicode_minus']=False    
    """
    custom_template = GeneratePythonCodePrompt(custom_instructions=instruction_template)
    return custom_template
PLOT_SAVE_DIR = "static/images/plots"
def main(excel_file_path, query):
    openai_api_key = os.environ.get("OPENAI_API_KEY", "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")

    if not openai_api_key:
        print("Error: Missing OpenAI API key")
        return

    try:
        file_ext = Path(excel_file_path).suffix.lower()

        if file_ext not in [".csv", ".xlsx", ".xls"]:
            print("Error: Unsupported file type. Please provide CSV or Excel file.")
            return

        try:
            if file_ext == ".csv":
                df = pd.read_csv(excel_file_path)
            else:
                df = pd.read_excel(excel_file_path)

            if df is None or df.empty:
                print("Error: Could not read or file is empty.")
                return

            llm = LangchainLLM(ChatOpenAI(openai_api_key=openai_api_key, openai_api_base='https://openrouter.ai/api/v1', model_name="openai/chatgpt-4o-latest"))
            config = Config(
                llm=llm, # Logs to console, might want a custom callback for web logs
                callback=StdoutCallback(),
                enable_cache=False,
                verbose=True, # Logs pandasai internal steps
                save_charts=True, # Enable saving charts
                custom_prompts={
                    "generate_python_code": get_prompt_template()
                },
                save_charts_path=PLOT_SAVE_DIR  # Removed os.path.join and 'static'
            )
            agent = Agent(df, config=config)

            if not query or not isinstance(query, str):
                print("Error: Invalid query - must be a non-empty string")
                return

            response = agent.chat(query)
            print(f"PandasAI response for query '{query}':", response)

            
            if isinstance(response, SmartDataframe):
                try:
                    df_dict = response.dataframe.to_dict(orient='records')
                    # Convert NaN values to None before JSON serialization
                    for row in df_dict:
                        for key, value in row.items():
                            if isinstance(value, float) and pd.isna(value):
                                row[key] = None
                    print(df_dict)
                    return

                except Exception as e:
                    print(f"Error converting dataframe to dict: {e}")
                    print(f"Successfully processed query, but couldn't display dataframe preview. Error: {e}")
                    return

            if isinstance(response, dict) and response.get("type") == "plot" and response.get("value"):
                print(str(response))
                return

            print(str(response))
            if response is None:
                print("Analysis returned no result - try rephrasing your query")
                return

        except Exception as e:
            print(f"Error during data analysis: {e}")
            return

    except Exception as e:
        print(f"File processing failed: {e}")
        return


if __name__ == "__main__":
    excel_file_path = input("Enter the path to the Excel file: ")
    query = input("Enter your query: ")
    main(excel_file_path, query)
