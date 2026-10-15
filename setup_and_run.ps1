Write-Host "Starting pxy888 1-Click Setup (PowerShell)..."

# 1. Setup Backend
Write-Host "Setting up Backend..."
Set-Location -Path "backend"
python -m venv venv
& .\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Start-Process -NoNewWindow -FilePath ".\venv\Scripts\uvicorn.exe" -ArgumentList "app.main:app --host 0.0.0.0 --port 8000 --reload"
Set-Location -Path ".."

# 2. Setup Frontend
Write-Host "Setting up Frontend..."
Set-Location -Path "frontend"
npm install
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run dev"
Set-Location -Path ".."

Write-Host "Backend running on http://localhost:8000"
Write-Host "Frontend running on http://localhost:3000"
Write-Host "Press Ctrl+C to stop both servers."
