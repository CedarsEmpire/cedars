$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Agent = Join-Path $Root "guludek_agent.py"
$Page = Join-Path $Root "guludek.html"

if (-not (Test-Path $Agent) -or -not (Test-Path $Page)) {
    throw "GULUDEK files are incomplete. Keep guludek_agent.py and guludek.html together."
}

$Python = Get-Command py -ErrorAction SilentlyContinue
if ($Python) {
    $Exe = $Python.Source
    $PythonArgs = @("-3", ('"' + $Agent + '"'))
} else {
    $Python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $Python) {
        throw "Python 3 is required. Install Python 3 from python.org, then run this script again."
    }
    $Exe = $Python.Source
    $PythonArgs = @('"' + $Agent + '"')
}

Write-Host ""
Write-Host "Starting your private GULUDEK companion..." -ForegroundColor Green
Write-Host "A console window will show your one-time access key on first start."
Write-Host "Keep that console window open while you use the dashboard."
Write-Host "Do not share the access key or expose port 8765 publicly."
$Process = Start-Process -FilePath $Exe -ArgumentList $PythonArgs -WorkingDirectory $Root -PassThru
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8765"
Write-Host ""
Write-Host "Dashboard opened. Companion process ID: $($Process.Id)"
Write-Host "To stop GULUDEK, close its companion console window."
Write-Host "Remote access is not enabled by this script; configure a private Tailscale network on both computers first."
