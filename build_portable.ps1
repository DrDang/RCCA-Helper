# build_portable.ps1
# ===================
# Builds a portable Windows distribution of RCCA Helper.
# Run from the project root (where package.json lives).
# Requires: Node.js + npm installed on the developer's machine.
#
# Usage:  .\build_portable.ps1
#         .\build_portable.ps1 -Port 8080

param(
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RCCA Helper - Portable Build Script"  -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------
# Step 1: Verify prerequisites
# -----------------------------------------------
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm is not installed or not in PATH." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Run this script from the project root." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "node_modules")) {
    Write-Host "  node_modules not found. Running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed." -ForegroundColor Red
        exit 1
    }
}
Write-Host "  Node.js $(node --version), npm $(npm --version)" -ForegroundColor Green

# -----------------------------------------------
# Step 2: Run Vite production build
# -----------------------------------------------
Write-Host "[2/5] Building production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "dist\index.html")) {
    Write-Host "ERROR: dist/index.html not found after build." -ForegroundColor Red
    exit 1
}
Write-Host "  Build complete." -ForegroundColor Green

# -----------------------------------------------
# Step 3: Create/clean Portable_Dist folder
# -----------------------------------------------
Write-Host "[3/5] Assembling portable distribution..." -ForegroundColor Yellow
$outDir = Join-Path $scriptDir "Portable_Dist"
if (Test-Path $outDir) {
    Remove-Item $outDir -Recurse -Force
}
New-Item -ItemType Directory -Path $outDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $outDir "app") | Out-Null

Copy-Item -Path "dist\*" -Destination (Join-Path $outDir "app") -Recurse
Write-Host "  Copied build output to Portable_Dist\app\" -ForegroundColor Green

# -----------------------------------------------
# Step 4: Generate server.ps1
# -----------------------------------------------
Write-Host "[4/5] Generating server script..." -ForegroundColor Yellow

$serverScript = @"
# server.ps1 - RCCA Helper Local Server
# This script serves the RCCA Helper web application locally.
# Do NOT close this window while using the app.

param(
    [int]`$Port = $Port
)

`$appDir = Join-Path `$PSScriptRoot "app"

if (-not (Test-Path (Join-Path `$appDir "index.html"))) {
    Write-Host "ERROR: app\index.html not found." -ForegroundColor Red
    Write-Host "Make sure this script is in the same folder as the 'app' directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# MIME type mapping
`$mimeTypes = @{
    ".html"  = "text/html; charset=utf-8"
    ".htm"   = "text/html; charset=utf-8"
    ".css"   = "text/css; charset=utf-8"
    ".js"    = "application/javascript; charset=utf-8"
    ".mjs"   = "application/javascript; charset=utf-8"
    ".json"  = "application/json; charset=utf-8"
    ".svg"   = "image/svg+xml"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".jpeg"  = "image/jpeg"
    ".gif"   = "image/gif"
    ".ico"   = "image/x-icon"
    ".webp"  = "image/webp"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"   = "font/ttf"
    ".eot"   = "application/vnd.ms-fontobject"
    ".map"   = "application/json"
    ".txt"   = "text/plain; charset=utf-8"
    ".xml"   = "application/xml"
    ".wasm"  = "application/wasm"
}

# Check if port is available
`$portInUse = `$false
try {
    `$tcp = New-Object System.Net.Sockets.TcpClient
    `$tcp.Connect("127.0.0.1", `$Port)
    `$tcp.Close()
    `$portInUse = `$true
} catch {
    # Port is available
}

if (`$portInUse) {
    Write-Host ""
    Write-Host "Port `$Port is already in use!" -ForegroundColor Red
    Write-Host "Another instance may already be running." -ForegroundColor Yellow
    Write-Host "Try opening http://localhost:`$Port in your browser." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Create and start the HTTP listener
`$prefix = "http://localhost:`$Port/"
`$http = New-Object System.Net.HttpListener
`$http.Prefixes.Add(`$prefix)

try {
    `$http.Start()
} catch [System.Net.HttpListenerException] {
    Write-Host ""
    Write-Host "ERROR: Could not start the server on port `$Port." -ForegroundColor Red
    Write-Host "Try closing other applications or restart your computer." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Write PID file for Stop_App.bat
`$pidFile = Join-Path `$PSScriptRoot ".server.pid"
`$PID | Out-File -FilePath `$pidFile -Encoding ASCII -NoNewline

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RCCA Helper is running!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Open your browser to:" -ForegroundColor White
Write-Host "  http://localhost:`$Port" -ForegroundColor Green
Write-Host ""
Write-Host "  To stop: close this window, press" -ForegroundColor White
Write-Host "  Ctrl+C, or run Stop_App.bat" -ForegroundColor White
Write-Host ""
Write-Host "  Log:" -ForegroundColor DarkGray

# Request handling loop
try {
    while (`$http.IsListening) {
        `$context = `$http.GetContext()
        `$request = `$context.Request
        `$response = `$context.Response

        `$urlPath = `$request.Url.LocalPath

        # Normalize path
        `$relativePath = `$urlPath.TrimStart('/')
        if (`$relativePath -eq "" -or `$relativePath -eq "/") {
            `$relativePath = "index.html"
        }

        `$filePath = Join-Path `$appDir `$relativePath

        # Security: prevent directory traversal
        `$resolvedPath = [System.IO.Path]::GetFullPath(`$filePath)
        `$resolvedAppDir = [System.IO.Path]::GetFullPath(`$appDir)

        if (-not `$resolvedPath.StartsWith(`$resolvedAppDir)) {
            `$response.StatusCode = 403
            `$body = [System.Text.Encoding]::UTF8.GetBytes("403 - Forbidden")
            `$response.ContentLength64 = `$body.Length
            `$response.OutputStream.Write(`$body, 0, `$body.Length)
            `$response.Close()
            Write-Host "  403 FORBIDDEN  `$urlPath" -ForegroundColor Red
            continue
        }

        if (Test-Path `$resolvedPath -PathType Leaf) {
            # Serve the file
            `$ext = [System.IO.Path]::GetExtension(`$resolvedPath).ToLower()
            `$contentType = if (`$mimeTypes.ContainsKey(`$ext)) { `$mimeTypes[`$ext] } else { "application/octet-stream" }
            `$response.ContentType = `$contentType
            `$response.StatusCode = 200

            # Cache headers: hashed assets are immutable, index.html is not
            if (`$urlPath -match "/assets/") {
                `$response.Headers.Add("Cache-Control", "public, max-age=31536000, immutable")
            } else {
                `$response.Headers.Add("Cache-Control", "no-cache")
            }

            `$fileBytes = [System.IO.File]::ReadAllBytes(`$resolvedPath)
            `$response.ContentLength64 = `$fileBytes.Length
            `$response.OutputStream.Write(`$fileBytes, 0, `$fileBytes.Length)
            `$response.Close()
            Write-Host "  200 OK         `$urlPath" -ForegroundColor DarkGray
        } else {
            # SPA fallback: serve index.html for unmatched routes
            `$indexPath = Join-Path `$appDir "index.html"
            if (Test-Path `$indexPath) {
                `$response.ContentType = "text/html; charset=utf-8"
                `$response.StatusCode = 200
                `$response.Headers.Add("Cache-Control", "no-cache")
                `$fileBytes = [System.IO.File]::ReadAllBytes(`$indexPath)
                `$response.ContentLength64 = `$fileBytes.Length
                `$response.OutputStream.Write(`$fileBytes, 0, `$fileBytes.Length)
                `$response.Close()
                Write-Host "  200 FALLBACK   `$urlPath -> index.html" -ForegroundColor DarkYellow
            } else {
                `$response.StatusCode = 404
                `$body = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found")
                `$response.ContentLength64 = `$body.Length
                `$response.OutputStream.Write(`$body, 0, `$body.Length)
                `$response.Close()
                Write-Host "  404 NOT FOUND  `$urlPath" -ForegroundColor Red
            }
        }
    }
} catch {
    if (`$_.Exception.InnerException -is [System.Net.HttpListenerException]) {
        # Normal shutdown
    } else {
        Write-Host "Server error: `$_" -ForegroundColor Red
    }
} finally {
    Write-Host ""
    Write-Host "Server stopped." -ForegroundColor Yellow
    if (`$http.IsListening) {
        `$http.Stop()
    }
    `$http.Close()
    if (Test-Path `$pidFile) {
        Remove-Item `$pidFile -Force -ErrorAction SilentlyContinue
    }
}
"@

Set-Content -Path (Join-Path $outDir "server.ps1") -Value $serverScript -Encoding UTF8
Write-Host "  Generated server.ps1" -ForegroundColor Green

# -----------------------------------------------
# Step 5: Generate launcher scripts and README
# -----------------------------------------------
Write-Host "[5/5] Generating launcher scripts..." -ForegroundColor Yellow

# --- Launch_App.bat ---
$launchBat = @"
@echo off
setlocal EnableDelayedExpansion

REM ============================================
REM   RCCA Helper Launcher
REM ============================================

title RCCA Helper

REM Resolve script directory
cd /d "%~dp0"

set PORT=$Port

REM Check if port is already in use
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo  =============================================
    echo   Port %PORT% is already in use.
    echo   RCCA Helper may already be running.
    echo.
    echo   Try opening http://localhost:%PORT%
    echo   in your browser.
    echo  =============================================
    echo.
    choice /C YN /M "Open browser anyway? (Y/N)"
    if !errorlevel! equ 1 (
        start "" "http://localhost:%PORT%"
    )
    exit /b 0
)

REM Check that required files exist
if not exist "%~dp0server.ps1" (
    echo.
    echo  ERROR: server.ps1 not found.
    echo  Make sure all files are in the same folder.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0app\index.html" (
    echo.
    echo  ERROR: app\index.html not found.
    echo  The application files may be missing.
    echo.
    pause
    exit /b 1
)

echo.
echo  =============================================
echo   Starting RCCA Helper...
echo   Please wait for the browser to open.
echo  =============================================
echo.
echo  NOTE: Keep the server window open while
echo  using the app. Close it to stop the server.
echo.

REM Start the PowerShell server in a new window
start "RCCA Helper Server" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port %PORT%

REM Wait for server to start (~2 seconds), then open browser
ping -n 3 127.0.0.1 >nul 2>&1

start "" "http://localhost:%PORT%"

exit /b 0
"@

Set-Content -Path (Join-Path $outDir "Launch_App.bat") -Value $launchBat -Encoding ASCII
Write-Host "  Generated Launch_App.bat" -ForegroundColor Green

# --- Stop_App.bat ---
$stopBat = @"
@echo off
setlocal EnableDelayedExpansion

REM ============================================
REM   RCCA Helper - Stop Server
REM ============================================

title Stop RCCA Helper

cd /d "%~dp0"

echo.
echo  Stopping RCCA Helper server...
echo.

set PID_FILE=%~dp0.server.pid

REM Method 1: Use PID file if available
if exist "%PID_FILE%" (
    set /p SERVER_PID=<"%PID_FILE%"
    echo  Found server process ^(PID: !SERVER_PID!^)
    taskkill /PID !SERVER_PID! /F >nul 2>&1
    if !errorlevel! equ 0 (
        echo  Server stopped successfully.
    ) else (
        echo  Process was already stopped.
    )
    del "%PID_FILE%" >nul 2>&1
    goto :done
)

REM Method 2: Find by window title
echo  PID file not found. Searching for server process...

set FOUND=0
for /f "tokens=2" %%p in ('tasklist /FI "WINDOWTITLE eq RCCA Helper Server" /FO TABLE /NH 2^>nul ^| findstr /R "[0-9]"') do (
    echo  Stopping process %%p...
    taskkill /PID %%p /F >nul 2>&1
    set FOUND=1
)

if !FOUND! equ 0 (
    echo  No running RCCA Helper server found.
    echo  It may have already been stopped.
)

:done
echo.
echo  Done.
echo.
timeout /t 3 >nul
exit /b 0
"@

Set-Content -Path (Join-Path $outDir "Stop_App.bat") -Value $stopBat -Encoding ASCII
Write-Host "  Generated Stop_App.bat" -ForegroundColor Green

# --- README.txt ---
$readme = @"
RCCA Helper - Portable Edition
===============================

QUICK START:
  1. Double-click "Launch_App.bat"
  2. Your browser will open automatically
  3. Keep the server window open while using the app

STOPPING:
  - Close the server window, OR
  - Double-click "Stop_App.bat"

NOTES:
  - Your data is saved in your browser's local storage
  - No internet connection required
  - No installation required
  - If port $Port is in use, close other applications
    using that port or restart your computer

TROUBLESHOOTING:
  - "Windows protected your PC" warning:
    Click "More info" then "Run anyway"
  - Browser doesn't open:
    Manually navigate to http://localhost:$Port
  - App won't start:
    Make sure all files are in the same folder
"@

Set-Content -Path (Join-Path $outDir "README.txt") -Value $readme -Encoding UTF8
Write-Host "  Generated README.txt" -ForegroundColor Green

# -----------------------------------------------
# Done
# -----------------------------------------------
$appSize = (Get-ChildItem -Path (Join-Path $outDir "app") -Recurse | Measure-Object -Property Length -Sum).Sum
$appSizeMB = [math]::Round($appSize / 1MB, 2)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Portable build complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Output:  Portable_Dist\" -ForegroundColor Green
Write-Host "  Size:    $appSizeMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "  To distribute: zip the Portable_Dist" -ForegroundColor Green
Write-Host "  folder and share the .zip file." -ForegroundColor Green
Write-Host ""
Write-Host "  To test: double-click" -ForegroundColor Green
Write-Host "  Portable_Dist\Launch_App.bat" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
