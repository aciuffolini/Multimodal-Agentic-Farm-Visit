@echo off
REM Start RAG service with environment variables from .env file
cd /d %~dp0

REM Read API key from .env file
for /f "tokens=2 delims==" %%a in ('findstr "OPENAI_API_KEY" .env') do set OPENAI_API_KEY=%%a
set OPENAI_API_KEY=%OPENAI_API_KEY:"=%

REM Set environment variable and start service
set OPENAI_API_KEY=%OPENAI_API_KEY%
python main.py

