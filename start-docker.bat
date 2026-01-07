@echo off
REM EDU Manager v2 - Docker Deployment
REM VI: Script khoi dong qua Docker (production)

echo ========================================
echo   EDU MANAGER V2 - DOCKER DEPLOYMENT
echo ========================================
echo.

echo [1/3] Building Docker images...
docker-compose build

echo.
echo [2/3] Starting containers...
docker-compose up -d

echo.
echo [3/3] Checking status...
timeout /t 5 /nobreak >nul
docker-compose ps

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE
echo ========================================
echo.
echo   Frontend: http://localhost
echo   Backend:  http://localhost:5000
echo.
echo   To stop: docker-compose down
echo   To view logs: docker-compose logs -f
echo.
echo Press any key to close...
pause >nul
