@echo off
echo ========================================
echo Starting All Servers
echo ========================================
echo.
echo 1. Vite Dev Server (port 5173)
echo 2. Chat API Server (port 3000)
echo 3. RAG Service (port 8000)
echo.
echo Opening 3 separate windows...
echo.

REM Start Vite dev server
start "Vite Dev Server" cmd /k "cd /d %~dp0 && echo Starting Vite Dev Server... && pnpm run dev"

timeout /t 3 /nobreak >nul

REM Start Chat API server
start "Chat API Server" cmd /k "cd /d %~dp0 && echo Starting Chat API Server... && node test-server.js"

timeout /t 3 /nobreak >nul

REM Start RAG service
set RAG_PATH=%~dp0..\..\server\rag_service
start "RAG Service" cmd /k "cd /d %RAG_PATH% && echo Starting RAG Service... && echo Make sure you have: && echo   1. Python installed && echo   2. Dependencies installed: pip install -r requirements.txt && echo   3. OPENAI_API_KEY set (optional) && echo. && python main.py"

echo.
echo ========================================
echo All servers starting in separate windows
echo ========================================
echo.
echo Wait for all servers to start, then:
echo   - Frontend: http://localhost:5173
echo   - Chat API: http://localhost:3000/health
echo   - RAG Service: http://localhost:8000/health
echo.
pause

