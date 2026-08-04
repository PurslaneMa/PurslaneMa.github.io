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

$adminPort = 4173
$adminRunning = $false
try {
  $adminResponse = Invoke-WebRequest -Uri "http://localhost:$adminPort" -UseBasicParsing -TimeoutSec 3
  if ($adminResponse.StatusCode -ge 200 -and $adminResponse.StatusCode -lt 500) { $adminRunning = $true }
} catch { $adminRunning = $false }
if (-not $adminRunning) {
  Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev') -WorkingDirectory (Join-Path $projectRoot 'admin-app') -WindowStyle Hidden
}
