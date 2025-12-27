@echo off
REM Create .env file for Farm Visit App
REM Run: create-env.bat

if exist .env (
    echo .env file already exists!
    echo.
    set /p overwrite="Overwrite? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo Cancelled.
        exit /b
    )
)

echo Creating .env file...

(
echo # Farm Visit App - Environment Variables
echo # DO NOT commit this file to git (it's in .gitignore)
echo.
echo # OpenAI API Key (Client-Side)
echo # Used for AI processing (photo captions, audio transcripts)
echo VITE_OPENAI_API_KEY=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
echo.
echo # RAG Service URL
echo # URL for semantic search and sync service
echo VITE_RAG_SERVER_URL=http://localhost:8000
echo.
echo # Chat API URL
echo # Leave empty to use Vite proxy (http://localhost:3000)
echo # Or set to production API URL for Android builds
echo VITE_API_URL=
) > .env

echo.
echo ✅ .env file created!
echo.
echo ⚠️  IMPORTANT: Restart your dev server for changes to take effect!
echo    Stop server (Ctrl+C) and run: pnpm run dev
echo.
pause

