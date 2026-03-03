@echo off
setlocal enabledelayedexpansion
title AI Career Copilot Environment
color 0B

echo =======================================================
echo          AI Career Copilot - Local Launcher
echo =======================================================
echo.

:: Check for .env file
if not exist .env (
    echo [!] WARNING: .env file not found. Creating from .env.example...
    copy .env.example .env
)

:: Check Backend Environment
echo [1/3] Starting Backend (FastAPI)...
if not exist "backend\venv" (
    echo [!] ERROR: Python virtual environment not found in backend\venv.
    echo Please run 'python -m venv venv' inside the backend folder.
    pause
    exit /b
)

start "Backend (FastAPI)" cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: Check Frontend Environment
echo [2/3] Starting Frontend (React/Vite)...
if not exist "frontend\node_modules" (
    echo [!] WARNING: node_modules not found in frontend. Running 'npm install'...
    start "Frontend Setup" /wait cmd /c "cd frontend && npm install"
)

start "Frontend (Vite)" cmd /k "cd frontend && npm run dev"

:: Verification & Ollama State
echo [3/3] System Checks...
echo.
echo [INFO] UI: http://localhost:5173
echo [INFO] API: http://localhost:8000/docs
echo.
echo Ensure Ollama is running if you want to use semantic features.
echo Database: SQLite (app.db) is active.
echo.

echo =======================================================
echo   Services are booting up in separate terminal windows!
echo =======================================================
echo You can close this main window. Keep server windows open.
echo.
pause
