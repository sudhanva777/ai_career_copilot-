Copy

@echo off
setlocal enabledelayedexpansion
title AI Career Copilot - Launcher
color 0A

echo.
echo  ==========================================
echo   AI Career Copilot - Starting Up...
echo  ==========================================
echo.

:: STEP 0: Check .env
if not exist .env (
    echo  [!] .env not found - copying from .env.example...
    if exist .env.example (
        copy .env.example .env >nul
        echo  [OK] .env created!
    ) else (
        echo  [ERROR] No .env.example found. Please create a .env file!
        pause
        exit /b 1
    )
) else (
    echo  [OK] .env file found
)
echo.

:: STEP 1: Check Python venv
echo  [1/5] Checking Python environment...
if not exist "backend\venv" (
    echo  [!] No virtual environment found. Creating one now...
    cd backend
    python -m venv venv
    if errorlevel 1 (
        echo  [ERROR] Failed to create venv. Is Python installed?
        pause
        exit /b 1
    )
    echo  [OK] Virtual environment created!
    echo  [!] Installing dependencies - this may take a few minutes...
    call venv\Scripts\activate
    pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo  [ERROR] Failed to install requirements. Check requirements.txt!
        pause
        exit /b 1
    )
    echo  [OK] All dependencies installed!
    cd ..
) else (
    echo  [OK] Python venv found
)
echo.

:: STEP 2: Check Node modules
echo  [2/5] Checking Frontend dependencies...
if not exist "frontend\node_modules" (
    echo  [!] node_modules not found. Running npm install...
    cd frontend
    call npm install --silent
    if errorlevel 1 (
        echo  [ERROR] npm install failed. Is Node.js installed?
        pause
        exit /b 1
    )
    echo  [OK] Node modules installed!
    cd ..
) else (
    echo  [OK] node_modules found
)
echo.

:: STEP 3: Start Ollama
echo  [3/5] Starting Ollama...
tasklist /FI "IMAGENAME eq ollama.exe" 2>nul | find /I "ollama.exe" >nul
if errorlevel 1 (
    echo  [!] Ollama not running. Starting it now...
    where ollama >nul 2>&1
    if errorlevel 1 (
        echo  [WARNING] Ollama not found in PATH!
        echo  Please download from: https://ollama.com/download
        echo  AI features will NOT work without Ollama!
        echo.
    ) else (
        start /min "" ollama serve
        echo  [OK] Ollama started in background
        timeout /t 3 /nobreak >nul
    )
) else (
    echo  [OK] Ollama already running
)
echo.

:: STEP 4: Start Backend
echo  [4/5] Starting Backend (FastAPI)...
start "Backend - FastAPI :8000" cmd /k "cd backend && call venv\Scripts\activate && echo. && echo  [Backend] Starting FastAPI... && echo. && uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"
echo  [OK] Backend launching on http://localhost:8000
echo.

:: STEP 5: Start Frontend
echo  [5/5] Starting Frontend (React/Vite)...
start "Frontend - Vite :5173" cmd /k "cd frontend && echo. && echo  [Frontend] Starting Vite... && echo. && npm run dev"
echo  [OK] Frontend launching on http://localhost:5173
echo.

:: Wait for services to fully boot
echo  Waiting for services to boot up (15 seconds)...
timeout /t 15 /nobreak >nul

:: Health Check Backend
echo  Checking if Backend is healthy...
set BACKEND_OK=0
for /L %%i in (1,1,10) do (
    curl -s http://localhost:8000/health >nul 2>&1
    if not errorlevel 1 (
        set BACKEND_OK=1
        goto :backend_ready
    )
    echo  [!] Waiting for backend... attempt %%i/10
    timeout /t 3 /nobreak >nul
)

:backend_ready
if !BACKEND_OK!==1 (
    echo  [OK] Backend is LIVE and healthy!
) else (
    echo  [WARNING] Backend is slow to start - check the Backend window for errors!
)
echo.

:: Open Browser automatically
echo  Opening your app in browser...
timeout /t 2 /nobreak >nul
start "" http://localhost:5173
echo  [OK] Browser opened!
echo.

:: Final status board
echo.
echo  ==========================================
echo   ALL SERVICES ARE RUNNING!
echo  ==========================================
echo.
echo   Your App    --^>  http://localhost:5173
echo   API Docs    --^>  http://localhost:8000/docs
echo   Health      --^>  http://localhost:8000/health
echo   Database    --^>  SQLite (backend/app.db)
echo   Ollama AI   --^>  http://localhost:11434
echo.
echo  ==========================================
echo   TO STOP ALL SERVICES:
echo   1. Close the Backend terminal window
echo   2. Close the Frontend terminal window
echo   3. Close this window
echo  ==========================================
echo.
echo  Keep this window open while using the app!
echo.
pause
