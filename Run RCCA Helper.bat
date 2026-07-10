@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "DIST_DIR=%SCRIPT_DIR%dist"
set "PORTABLE_HTML=%DIST_DIR%\RCCA Helper.html"

if exist "%PORTABLE_HTML%" (
  start "" "%PORTABLE_HTML%"
  exit /b 0
)

echo RCCA Helper portable app was not found.
echo Expected:
echo   "%PORTABLE_HTML%"
echo.
echo Rebuild the app with:
echo   npm install
echo   npm run build
echo.
pause
exit /b 1
