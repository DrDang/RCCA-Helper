param(
    [int]$StartPort = 4173
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Join-Path $scriptDir "dist"

if (-not (Test-Path (Join-Path $distDir "index.html"))) {
    Write-Host "RCCA Helper build files were not found." -ForegroundColor Red
    Write-Host "Run npm install and npm run build first." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

function Get-FreePort {
    param([int]$FirstPort)

    for ($port = $FirstPort; $port -lt ($FirstPort + 50); $port++) {
        $listener = $null
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
            $listener.Start()
            $listener.Stop()
            return $port
        } catch {
            if ($listener) {
                $listener.Stop()
            }
        }
    }

    throw "Could not find an open port."
}

function Get-ContentType {
    param([string]$Path)

    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { "text/html; charset=utf-8" }
        ".css" { "text/css; charset=utf-8" }
        ".js" { "application/javascript; charset=utf-8" }
        ".mjs" { "application/javascript; charset=utf-8" }
        ".json" { "application/json; charset=utf-8" }
        ".svg" { "image/svg+xml" }
        ".png" { "image/png" }
        ".jpg" { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        ".gif" { "image/gif" }
        ".ico" { "image/x-icon" }
        ".webp" { "image/webp" }
        ".woff" { "font/woff" }
        ".woff2" { "font/woff2" }
        ".map" { "application/json; charset=utf-8" }
        default { "application/octet-stream" }
    }
}

$port = Get-FreePort -FirstPort $StartPort
$prefix = "http://127.0.0.1:$port/"
$http = [System.Net.HttpListener]::new()
$http.Prefixes.Add($prefix)
$http.Start()

Write-Host ""
Write-Host "RCCA Helper is running at $prefix" -ForegroundColor Green
Write-Host "Keep this window open while using the app." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the local server." -ForegroundColor Yellow
Write-Host ""

Start-Process $prefix

try {
    while ($http.IsListening) {
        $context = $http.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $relativePath = $request.Url.AbsolutePath.TrimStart("/")
            if ([string]::IsNullOrWhiteSpace($relativePath)) {
                $relativePath = "index.html"
            }

            $candidatePath = Join-Path $distDir $relativePath
            $resolvedPath = [System.IO.Path]::GetFullPath($candidatePath)
            $resolvedDistDir = [System.IO.Path]::GetFullPath($distDir)

            if (-not $resolvedPath.StartsWith($resolvedDistDir, [System.StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                $body = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
                $response.OutputStream.Write($body, 0, $body.Length)
                $response.Close()
                continue
            }

            if (-not (Test-Path $resolvedPath -PathType Leaf)) {
                $resolvedPath = Join-Path $distDir "index.html"
            }

            $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
            $response.StatusCode = 200
            $response.ContentType = Get-ContentType -Path $resolvedPath
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
        } catch {
            $response.StatusCode = 500
            $body = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
            $response.OutputStream.Write($body, 0, $body.Length)
            $response.Close()
        }
    }
} finally {
    if ($http.IsListening) {
        $http.Stop()
    }
    $http.Close()
}
