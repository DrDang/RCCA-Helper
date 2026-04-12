@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "DIST_DIR=%SCRIPT_DIR%dist"
set "SERVER_SCRIPT=%SCRIPT_DIR%serve-rcca-helper.ps1"

if not exist "%DIST_DIR%\index.html" (
  echo RCCA Helper build files were not found.
  echo Expected: "%DIST_DIR%\index.html"
  echo.
  echo If you changed the source code, rebuild the app first with:
  echo   npm install
  echo   npm run build
  pause
  exit /b 1
)

if not exist "%SERVER_SCRIPT%" (
  echo Launcher script not found:
  echo   "%SERVER_SCRIPT%"
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SERVER_SCRIPT%"
