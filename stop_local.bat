@echo off
title Stopping AI Career Copilot
color 0C
echo.
echo  ==========================================
echo   AI Career Copilot - Stopping Services...
echo  ==========================================
echo.
echo  Stopping all services...
taskkill /F /FI "WINDOWTITLE eq Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend*" /T >nul 2>&1
taskkill /F /IM ollama.exe /T >nul 2>&1
echo  [OK] Backend stopped
echo  [OK] Frontend stopped
echo  [OK] Ollama stopped
echo.
echo  All services have been stopped.
echo.
pause
