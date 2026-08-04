$ErrorActionPreference = 'SilentlyContinue'

& "$PSScriptRoot\start-local-blog.ps1"
Start-Sleep -Seconds 2

Start-Process 'http://localhost:4000'
Start-Process 'http://localhost:4000/admin'
