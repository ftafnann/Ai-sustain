@echo off
title EcoSphere AI Backend
color 0A

echo.
echo  ╔════════════════════════════════════════╗
echo  ║   🌍 EcoSphere AI Backend Startup      ║
echo  ╚════════════════════════════════════════╝
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ Node.js not found!
  echo    Download from: https://nodejs.org
  pause
  exit /b 1
)
echo ✅ Node.js found

REM Install dependencies if needed
if not exist node_modules (
  echo.
  echo 📦 Installing dependencies...
  npm install
  echo ✅ Dependencies installed
) else (
  echo ✅ Dependencies already installed
)

REM Check if Ollama is running
echo.
echo 🤖 Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
  echo ⚠  Ollama not running. Starting Ollama...
  start "" ollama serve
  timeout /t 3 /nobreak >nul
) else (
  echo ✅ Ollama is running
)

REM Pull llama3 if not available
echo 📥 Ensuring llama3 model is available...
ollama pull llama3 2>nul
echo ✅ Herms AI model ready

echo.
echo 🚀 Starting EcoSphere AI Backend on port 3001...
echo    Open: http://localhost:3001/api/health
echo    Press Ctrl+C to stop
echo.

node server.js
pause
