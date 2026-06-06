@echo off
REM Batch script to start backend first (in a new window) then frontend (in this window)
SETLOCAL

:: Get script directory (including trailing backslash)
SET SCRIPT_DIR=%~dp0

SET "PYTHON_BIN=%SCRIPT_DIR%.venv\Scripts\python.exe"
IF NOT EXIST "%PYTHON_BIN%" (
  echo Creating Python virtual environment...
  where py >NUL 2>NUL
  IF NOT ERRORLEVEL 1 (
    py -3 -m venv "%SCRIPT_DIR%.venv"
  ) ELSE (
    python -m venv "%SCRIPT_DIR%.venv"
  )
)

IF NOT EXIST "%PYTHON_BIN%" (
  echo Error: could not create or find "%PYTHON_BIN%".
  exit /b 1
)

echo Installing backend dependencies...
"%PYTHON_BIN%" -m pip install -r "%SCRIPT_DIR%backend\requirements.txt"
if errorlevel 1 exit /b 1

SET "BACKEND_STARTED=0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try {" ^
  "  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/health' -TimeoutSec 1;" ^
  "  if ($health.modelLoaded) { exit 0 }" ^
  "} catch {}" ^
  "exit 1"

if errorlevel 1 (
echo Starting backend (Flask) in a new window...
REM Open a new cmd window that runs the backend and keeps the window open
start "backend" cmd /k "cd /d ""%SCRIPT_DIR%backend"" && set FLASK_DEBUG=0 && ""%PYTHON_BIN%"" -u app.py"
SET "BACKEND_STARTED=1"
) else (
echo Backend is already running and model.pkl is loaded.
)

echo Waiting for backend to become ready on 127.0.0.1:5000...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline = (Get-Date).AddSeconds(60);" ^
  "while ((Get-Date) -lt $deadline) {" ^
  "  try {" ^
  "    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/health' -TimeoutSec 1;" ^
  "    if ($health.modelLoaded) { Write-Host 'Backend is ready and model.pkl is loaded.'; exit 0 }" ^
  "  } catch { Start-Sleep -Seconds 1 }" ^
  "}" ^
  "Write-Host 'Timed out waiting for backend readiness or model.pkl loading.'; exit 1"

if errorlevel 1 exit /b 1

echo Starting frontend (Vite) in this window...
cd /d "%SCRIPT_DIR%frontend"
npm run dev

IF "%BACKEND_STARTED%"=="1" (
  echo Frontend process exited. The backend was started in a separate window and will remain running.
) ELSE (
  echo Frontend process exited. The existing backend is still running.
)
ENDLOCAL
