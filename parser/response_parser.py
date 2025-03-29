import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any
import os # Import os

from pandasai.responses import ResponseParser


class CustomResponseParser(ResponseParser):
    def format_plot(self, result: dict) -> Any:
        # The 'result' dictionary from pandasai should contain the path
        # where the plot was actually saved, typically in result['value'].
        original_path_str = result.get("value")

        if not original_path_str:
            print("Error: No plot path found in pandasai result.")
            return {"type": "error", "value": "PandasAI did not return a path for the generated plot."}

        original_path = Path(original_path_str)

        # Ensure the original plot file exists
        if not original_path.exists():
            print(f"Error: Plot file specified by pandasai does not exist: {original_path}")
            return {"type": "error", "value": f"Generated plot file not found at '{original_path}'."}

        # Define the target directory relative to the project root
        target_dir_name = "static/plots"
        target_dir = Path(target_dir_name)

        # Ensure the target directory exists
        target_dir.mkdir(parents=True, exist_ok=True)

        # Generate a new filename with UUID
        new_filename = f"{uuid.uuid4()}.png"
        # Create the full path for the new file within the target directory
        new_plot_path = target_dir / new_filename

        try:
            # Copy the original plot (which might have a different UUID name)
            # to the new path within the *same* target directory.
            # This effectively renames it while keeping it in static/plots.
            shutil.copy(original_path, new_plot_path)
            print(f"Plot processed and saved to: {new_plot_path}")

            # Return the path relative to the static folder for web access
            # The server serves 'static' folder, so the URL path starts after 'static/'
            relative_url_path = os.path.join("plots", new_filename) # e.g., plots/uuid.png
            return {"type": "plot", "value": relative_url_path}

        except Exception as e:
            print(f"Error copying plot from {original_path} to {new_plot_path}: {e}")
            return {"type": "error", "value": f"Failed to process plot: {e}"}
