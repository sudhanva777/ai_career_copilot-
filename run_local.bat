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
if not exist backend\.env (
    echo  [!] backend\.env not found - copying from .env.example...
    if exist .env.example (
        copy .env.example backend\.env >nul
        echo  [OK] backend\.env created - please set your SECRET_KEY before using the app!
    ) else (
        echo  [ERROR] No .env.example found. Please create a backend\.env file!
        pause
        exit /b 1
    )
) else (
    echo  [OK] backend\.env file found
)
echo.

:: STEP 1: Check Python venv
echo  [1/6] Checking Python environment...
if not exist "backend\venv" (
    echo  [!] No virtual environment found. Creating one now...
    cd backend
    python -m venv venv
    if errorlevel 1 (
        echo  [ERROR] Failed to create venv. Is Python 3.10+ installed and in PATH?
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
    cd backend
    call venv\Scripts\activate
    cd ..
)
echo.

:: spaCy model check
echo  [1b] Checking spaCy language model...
cd backend
python -c "import spacy; spacy.load('en_core_web_sm')" 2>nul
if errorlevel 1 (
    echo  [!] Installing spaCy language model...
    python -m spacy download en_core_web_sm
    if errorlevel 1 (
        echo  [WARNING] spaCy model install failed - NLP features may be limited
    ) else (
        echo  [OK] spaCy model installed
    )
) else (
    echo  [OK] spaCy model ready
)
cd ..
echo.

:: STEP 1c: Run database migrations
echo  [1c] Running database migrations...
cd backend
call venv\Scripts\activate
alembic upgrade head
if errorlevel 1 (
    echo  [ERROR] Migration failed - check alembic/versions/ for conflicts
    pause
    exit /b 1
)
echo  [OK] Database up to date
cd ..
echo.

:: STEP 2: Check Node modules
echo  [2/6] Checking Frontend dependencies...
if not exist "frontend\node_modules" (
    echo  [!] node_modules not found. Running npm install...
    cd frontend
    call npm install --silent
    if errorlevel 1 (
        echo  [ERROR] npm install failed. Is Node.js 18+ installed?
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
echo  [3/6] Starting Ollama...
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

        :: Check if llama3 model is available
        ollama list 2>nul | find /I "llama3" >nul
        if errorlevel 1 (
            echo  [!] llama3 not found. Pulling now - first run only,
            echo      this may take several minutes depending on internet...
            ollama pull llama3
            if errorlevel 1 (
                echo  [WARNING] Failed to pull llama3 - AI coaching will fall back to templates
            ) else (
                echo  [OK] llama3 model ready
            )
        ) else (
            echo  [OK] llama3 model ready
        )
    )
) else (
    echo  [OK] Ollama already running

    :: Still check if model is pulled even if ollama was already running
    ollama list 2>nul | find /I "llama3" >nul
    if errorlevel 1 (
        echo  [!] llama3 not found. Pulling now...
        ollama pull llama3
    ) else (
        echo  [OK] llama3 model ready
    )
)
echo.

:: STEP 4: Start Backend
echo  [4/6] Starting Backend (FastAPI)...
start "Backend - FastAPI :8000" cmd /k "cd backend && call venv\Scripts\activate && echo. && echo  [Backend] Starting FastAPI... && echo. && uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"
echo  [OK] Backend launching on http://localhost:8000
echo.

:: STEP 5: Start Frontend
echo  [5/6] Starting Frontend (React/Vite)...
start "Frontend - Vite :3000" cmd /k "cd frontend && echo. && echo  [Frontend] Starting Vite... && echo. && npm run dev"
echo  [OK] Frontend launching on http://localhost:3000
echo.

:: Wait for services to fully boot
echo  [6/6] Waiting for services to boot up (15 seconds)...
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
start "" http://localhost:3000
echo  [OK] Browser opened!
echo.

:: Final status board
echo.
echo  ==========================================
echo   ALL SERVICES ARE RUNNING!
echo  ==========================================
echo.
echo   Your App    --^>  http://localhost:3000
echo   API Docs    --^>  http://localhost:8000/docs
echo   Health      --^>  http://localhost:8000/health
echo   Database    --^>  SQLite (backend/app.db)
echo   Ollama AI   --^>  http://localhost:11434
echo.
echo  ==========================================
echo   TO STOP ALL SERVICES:
echo   Double-click stop_local.bat
echo   (or close the Backend and Frontend windows)
echo  ==========================================
echo.
echo  Keep this window open while using the app!
echo.
pause
