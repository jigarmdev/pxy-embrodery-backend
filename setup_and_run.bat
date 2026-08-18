@echo off
echo Starting pxy888 1-Click Setup (Windows)...

:: 1. Setup Backend
echo Setting up Backend...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
start "pxy888 Backend (FastAPI)" cmd /k "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
cd ..

:: 2. Setup Frontend
echo Setting up Frontend...
cd frontend
call npm install
start "pxy888 Frontend (Next.js)" cmd /k "npm run dev"
cd ..

echo Servers are launching in separate windows.
pause
