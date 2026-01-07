@echo off
REM EDU Manager v2 - Local Development
REM VI: Script khoi dong cho development local

echo ========================================
echo   EDU MANAGER V2 - LOCAL DEVELOPMENT
echo ========================================
echo.

REM Kill any existing processes on ports 3000 and 5000
echo [1/4] Clearing ports...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

REM Start Backend
echo [2/4] Starting Backend (http://localhost:5000)...
cd /d "%~dp0backend"
start "EDU Backend" cmd /k "npm run dev"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [3/4] Starting Frontend (http://localhost:3000)...
cd /d "%~dp0frontend"
start "EDU Frontend" cmd /k "npm run dev"

REM Wait for frontend to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   SERVERS STARTED SUCCESSFULLY
echo ========================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo   KANBAN:   Open dashboard.html in browser
echo.
echo   Login: admin / admin123
echo.
echo [4/4] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to close this window...
pause >nul
