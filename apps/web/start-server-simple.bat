@echo off
title Farm Visit Test Server
color 0A
echo.
echo ========================================
echo   FARM VISIT TEST SERVER
echo ========================================
echo.
echo Starting server on port 3000...
echo.
echo Keep this window OPEN while testing!
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.
cd /d "%~dp0"
node test-server.js
pause






