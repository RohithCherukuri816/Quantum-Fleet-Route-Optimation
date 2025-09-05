(
echo @echo off
echo REM === Activate virtual environment and run backend ===
echo if not exist venv (
echo.   python -m venv venv
echo.   call venv\Scripts\activate
echo.   pip install --upgrade pip
echo.   pip install -r requirements.txt
echo ) else (
echo.   call venv\Scripts\activate
echo )
echo python app.py
) > run_backend.bat
