@echo off
setlocal
if "%~1"=="" (
  echo Usage: restore.bat path\to\backup.v2.json
  exit /b 1
)
if not "%RESTORE_CONFIRMATION%"=="RESTORE_EDU_MANAGER" (
  echo ERROR: Set RESTORE_CONFIRMATION=RESTORE_EDU_MANAGER explicitly.
  exit /b 1
)
npx tsx "%~dp0scripts\restore-operator.ts" "%~1"
exit /b %ERRORLEVEL%
