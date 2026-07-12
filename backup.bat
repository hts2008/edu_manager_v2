@echo off
setlocal
if "%BACKUP_ENCRYPTION_KEY%"=="" (
  echo ERROR: BACKUP_ENCRYPTION_KEY is required.
  exit /b 1
)
if "%BACKUP_ENCRYPTION_KEY_ID%"=="" (
  echo ERROR: BACKUP_ENCRYPTION_KEY_ID is required.
  exit /b 1
)
if not exist "%~dp0backups" mkdir "%~dp0backups"
npx tsx "%~dp0scripts\backup-operator.ts" "%~dp0backups\edu-manager-backup.v2.json"
exit /b %ERRORLEVEL%
