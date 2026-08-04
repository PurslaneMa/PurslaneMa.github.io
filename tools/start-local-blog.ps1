$ErrorActionPreference = 'SilentlyContinue'

$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 4000

$alreadyRunning = $false
try {
  $response = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 3
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
    $alreadyRunning = $true
  }
} catch {
  $alreadyRunning = $false
}

if (-not $alreadyRunning) {
  Start-Process -FilePath 'npm.cmd' `
    -ArgumentList @('run', 'server', '--', '-p', "$port") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden
}
