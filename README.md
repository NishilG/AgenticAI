# Email Automation System

This system consists of two separate Flask servers:

## Backend Server (Port 5000)
- Handles email sending, chat functionality, and tool routing
- Requirements: `requirements_backend.txt`

## Data Analysis Server (Port 5001) 
- Handles data analysis and visualization
- Requirements: `requirements_data_analysis.txt`

## Setup Instructions

1. Create virtual environments:

```bash
python -m venv backend_venv
python -m venv data_analysis_venv
```

2. Activate and install dependencies for each:

```bash
# Backend server
source backend_venv/bin/activate
pip install -r requirements_backend.txt
playwright install
deactivate

# Data analysis server  
source data_analysis_venv/bin/activate
pip install -r requirements_data_analysis.txt
deactivate
```

3. Run the servers:

```bash
# In one terminal (backend)
source backend_venv/bin/activate
python backend.py
deactivate

# In another terminal (data analysis)
source data_analysis_venv/bin/activate  
python data_analysis_server.py
deactivate
```

4. Access the web interface at `http://localhost:5000`
