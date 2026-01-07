@echo off
REM EDU Manager v2 - Restore Script
REM VI: Khoi phuc database va uploads tu backup

echo ========================================
echo   EDU MANAGER V2 - RESTORE
echo ========================================
echo.

REM List available backups
echo Available backups:
echo.
dir /b /ad "%~dp0backups\" 2>nul
echo.

set /p BACKUP_NAME=Enter backup folder name (e.g., backup_20260107_120000): 

set BACKUP_DIR=%~dp0backups\%BACKUP_NAME%

if not exist "%BACKUP_DIR%" (
    echo.
    echo ERROR: Backup folder not found: %BACKUP_DIR%
    echo.
    pause
    exit /b 1
)

echo.
echo WARNING: This will overwrite current data!
set /p CONFIRM=Are you sure? (Y/N): 

if /i not "%CONFIRM%"=="Y" (
    echo Restore cancelled.
    pause
    exit /b 0
)

echo.
echo [1/3] Stopping servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [2/3] Restoring database...
if exist "%BACKUP_DIR%\edumanager.db" (
    copy /Y "%BACKUP_DIR%\edumanager.db" "%~dp0backend\data\edumanager.db" >nul
    echo     - Database restored
) else (
    echo     - No database in backup
)

echo [3/3] Restoring uploads...
if exist "%BACKUP_DIR%\uploads" (
    xcopy "%BACKUP_DIR%\uploads" "%~dp0backend\uploads\" /E /I /Q /Y >nul
    echo     - Uploads restored
) else (
    echo     - No uploads in backup
)

echo.
echo ========================================
echo   RESTORE COMPLETE
echo ========================================
echo.
echo   Restored from: %BACKUP_DIR%
echo   Please restart the servers.
echo.
echo Press any key to close...
pause >nul
