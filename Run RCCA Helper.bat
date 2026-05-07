@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "DIST_DIR=%SCRIPT_DIR%dist"
set "PORTABLE_HTML=%DIST_DIR%\RCCA Helper.html"
set "SERVER_SCRIPT=%SCRIPT_DIR%serve-rcca-helper.ps1"

if exist "%PORTABLE_HTML%" (
  start "" "%PORTABLE_HTML%"
  exit /b 0
)

if not exist "%DIST_DIR%\index.html" (
  echo RCCA Helper build files were not found.
  echo Expected: "%PORTABLE_HTML%"
  echo.
  echo If you changed the source code, rebuild the app first with:
  echo   npm install
  echo   npm run build
  pause
  exit /b 1
)

echo Portable RCCA Helper HTML was not found.
echo Falling back to the local server launcher.
echo To regenerate the portable HTML, run:
echo   npm run build
echo.

if not exist "%SERVER_SCRIPT%" (
  echo Launcher script not found:
  echo   "%SERVER_SCRIPT%"
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SERVER_SCRIPT%"
