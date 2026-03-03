@echo off
title AI Career Copilot Environment
echo =======================================================
echo          AI Career Copilot - Local Launcher
echo =======================================================
echo.

echo [1/3] Starting Backend (FastAPI)...
:: Open a new window, navigate to backend, activate venv, and run uvicorn
start "Backend (FastAPI)" cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo [2/3] Starting Frontend (React/Vite)...
:: Open a new window, navigate to frontend, and start Vite
start "Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo [3/3] Checking Ollama...
echo Ensure Ollama is running locally if you want to use the AI Coach.
echo If Postgres is running locally on port 5432, everything is ready.
echo.

echo =======================================================
echo   Services are booting up in separate terminal windows!
echo   Frontend React UI:   http://localhost:5173 
echo   Backend API Swagger: http://localhost:8000/docs
echo =======================================================
echo You can close this main window, but leave the pop-up terminals open to keep the servers running.
echo.
pause
