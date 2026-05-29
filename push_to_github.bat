@echo off
REM ═══════════════════════════════════════════════════════════
REM  EcoSphere AI — GitHub Push Script
REM  Run this from the new_ai folder to push to:
REM  https://github.com/ftafnann/Ai-sustain
REM ═══════════════════════════════════════════════════════════

echo.
echo [1/6] Initializing git repository...
git init

echo.
echo [2/6] Setting remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/ftafnann/Ai-sustain.git

echo.
echo [3/6] Staging all files...
git add .

echo.
echo [4/6] Committing...
git commit -m "feat: EcoSphere AI frontend v1.0 - climate-smart agriculture platform

- Full 10-page SPA: Hero, Dashboard, Simulation, Virtual Farm, Reservoir,
  AI Advisor, Satellite Map, Alerts, Analytics, Future Features
- Live weather via Open-Meteo API (no key required)
- Manual location search with Nominatim geocoding autocomplete
- ROI calculator with validation and animated results
- Interactive Leaflet.js satellite map with NDVI/Drought/Water layers
- Multilingual AI chatbot (English, Hindi, Kannada)
- Dashboard reset and ROI reset functionality
- Toast notification system, loading splash, status bar
- connector.md: complete backend API integration guide with line numbers"

echo.
echo [5/6] Setting branch to main...
git branch -M main

echo.
echo [6/6] Pushing to GitHub...
git push -u origin main --force

echo.
echo ✅ Done! Visit: https://github.com/ftafnann/Ai-sustain
pause
