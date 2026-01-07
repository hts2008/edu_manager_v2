@echo off
REM EDU Manager v2 - Backup Script
REM VI: Sao luu database va uploads

echo ========================================
echo   EDU MANAGER V2 - BACKUP
echo ========================================
echo.

REM Create backup directory with timestamp
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=%~dp0backups\backup_%TIMESTAMP%

echo [1/4] Creating backup directory...
mkdir "%BACKUP_DIR%" 2>nul

echo [2/4] Backing up database...
if exist "%~dp0backend\data\edumanager.db" (
    copy "%~dp0backend\data\edumanager.db" "%BACKUP_DIR%\edumanager.db" >nul
    echo     - Database backed up
) else (
    echo     - No database found
)

echo [3/4] Backing up uploads...
if exist "%~dp0backend\uploads" (
    xcopy "%~dp0backend\uploads" "%BACKUP_DIR%\uploads\" /E /I /Q >nul
    echo     - Uploads backed up
) else (
    echo     - No uploads found
)

echo [4/4] Creating backup info...
echo Backup created: %date% %time% > "%BACKUP_DIR%\backup_info.txt"
echo Location: %BACKUP_DIR% >> "%BACKUP_DIR%\backup_info.txt"

echo.
echo ========================================
echo   BACKUP COMPLETE
echo ========================================
echo.
echo   Location: %BACKUP_DIR%
echo.
echo Press any key to close...
pause >nul
