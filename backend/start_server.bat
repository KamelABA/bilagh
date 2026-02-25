@echo off
echo Stopping any process on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo Starting backend server...
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
python main.py
