@echo off
REM EDU Manager v2 - Stop Script
REM VI: Dung tat ca servers

echo ========================================
echo   EDU MANAGER V2 - STOP SERVERS
echo ========================================
echo.

echo Stopping Backend (port 5000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    echo     - Killed PID %%a
)

echo Stopping Frontend (port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    echo     - Killed PID %%a
)

echo.
echo ========================================
echo   SERVERS STOPPED
echo ========================================
echo.
echo Press any key to close...
pause >nul
