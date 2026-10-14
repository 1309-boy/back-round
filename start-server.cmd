@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto error
)
call npm run build
if errorlevel 1 goto error
echo Open http://localhost:2567 in your browser.
call npm start
goto end
:error
echo Setup failed. Check the error above.
:end
pause
