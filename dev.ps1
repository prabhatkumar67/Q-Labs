# Starts the Q Labs API, demo store and UI for local development, then opens the studio.
# Usage: ./dev.ps1            (first run also installs dependencies)
#        ./dev.ps1 -Stop      (stops the three servers)
# Set QLABS_PYTHON to use an existing Python environment instead of control-panel-api/.venv.
param([switch]$Stop)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$api = Join-Path $root "control-panel-api"
$ui = Join-Path $root "control-panel-ui"
$ports = @{ API = 8000; Store = 8120; UI = 3000 }

$runtime = Join-Path $root ".runtime"
$registry = Join-Path $runtime "processes.json"

# Only stop processes recorded by this checkout. Never kill an unrelated app by port or name.
function Stop-Servers {
    if (-not (Test-Path -LiteralPath $registry)) { return }
    $records = @(Get-Content -LiteralPath $registry -Raw | ConvertFrom-Json)
    foreach ($record in $records) {
        $owned = Get-Process -Id $record.Id -ErrorAction SilentlyContinue
        if (-not $owned -or $owned.StartTime.ToUniversalTime().Ticks -ne ([datetime]$record.StartedAt).ToUniversalTime().Ticks) { continue }
        $processes = @(Get-CimInstance Win32_Process)
        $pending = [System.Collections.Generic.Queue[int]]::new()
        $pending.Enqueue([int]$record.Id)
        $ownedIds = [System.Collections.Generic.List[int]]::new()
        while ($pending.Count -gt 0) {
            $currentId = $pending.Dequeue()
            $ownedIds.Add($currentId)
            $processes | Where-Object { $_.ParentProcessId -eq $currentId } | ForEach-Object { $pending.Enqueue([int]$_.ProcessId) }
        }
        $ownedIds.Reverse()
        $ownedIds | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    }
    Set-Content -LiteralPath $registry -Value "[]"
}

if ($Stop) {
    Stop-Servers
    Write-Host "Stopped Q Labs servers."
    return
}

# Python environment
$python = $env:QLABS_PYTHON
if (-not $python) {
    $python = Join-Path $api ".venv\Scripts\python.exe"
    if (-not (Test-Path $python)) {
        Write-Host "Creating control-panel-api/.venv ..."
        py -3.13 -m venv (Join-Path $api ".venv")
        if ($LASTEXITCODE -ne 0) { throw "Python environment creation failed." }
        & $python -m pip install --quiet -r (Join-Path $api "requirements-sqlite.txt")
        if ($LASTEXITCODE -ne 0) { throw "API dependency installation failed." }
        & $python -m playwright install chromium
        if ($LASTEXITCODE -ne 0) { throw "Chromium installation failed." }
    }
}
if (-not (Test-Path $python)) { throw "Python not found at $python. Set QLABS_PYTHON or install Python 3.13." }

# Next.js keeps a few hundred MB of dev cache next to the UI; a full drive makes it fail in confusing ways.
$drive = Get-PSDrive -Name (Split-Path $root -Qualifier).TrimEnd(":") -ErrorAction SilentlyContinue
if ($drive -and $drive.Free -lt 1GB) {
    $hashBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($root))
    $cacheId = ([BitConverter]::ToString($hashBytes) -replace '-', '').Substring(0, 12)
    $cacheRoot = Join-Path $env:LOCALAPPDATA "QLabs\cache\$cacheId"
    $cacheLink = Join-Path $ui ".next-local"
    if (-not (Test-Path -LiteralPath $cacheLink)) {
        New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
        New-Item -ItemType Junction -Path $cacheLink -Target $cacheRoot | Out-Null
    }
    $env:NEXT_DIST_DIR = ".next-local"
    $env:NODE_PATH = Join-Path $ui "node_modules"
    Write-Host "Low workspace disk space: using the separate .next-local cache. Existing files were not removed."
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "Node.js was not found. Install Node.js 22 and run again." }

# Configuration
$envFile = Join-Path $api ".env"
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $api ".env.example") $envFile
    Write-Warning "Created control-panel-api/.env. Add GROQ_API_KEY (and Deepgram keys for the live mic), then run again."
}
$uiEnv = Join-Path $ui ".env"
if (-not (Test-Path $uiEnv)) { Copy-Item (Join-Path $ui ".env.example") $uiEnv }
if (-not (Test-Path (Join-Path $ui "node_modules"))) {
    Write-Host "Installing UI dependencies ..."
    Push-Location $ui
    $npmCli = @(
        (Join-Path (Split-Path $node -Parent) "node_modules\npm\bin\npm-cli.js"),
        (Join-Path $env:ProgramFiles "nodejs\node_modules\npm\bin\npm-cli.js")
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($npmCli) { & $node $npmCli ci --ignore-scripts --no-audit --no-fund }
    else { npm ci --ignore-scripts --no-audit --no-fund }
    $installExit = $LASTEXITCODE
    Pop-Location
    if ($installExit -ne 0) { throw "UI dependency installation failed." }
}

# Servers, each in its own window, with output also written to .logs/ so a failed start can be diagnosed
Stop-Servers
foreach ($port in $ports.Values) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already occupied by a process not owned by this launcher. Stop that server explicitly before starting Q Labs."
    }
}
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
$records = @()
$logs = Join-Path $root ".logs"
New-Item -ItemType Directory -Force $logs | Out-Null
$shell = (Get-Process -Id $PID).Path
$servers = @(
    @{ Title = "Q Labs API"; Log = "api"; Dir = $api; Command = "& '$python' -m uvicorn app.main:app --host 127.0.0.1 --port 8000" },
    @{ Title = "Q Labs demo store"; Log = "store"; Dir = $api; Command = "& '$python' -m uvicorn app.acceptance_demo:app --host 127.0.0.1 --port 8120" },
    # Next is started with this session's node directly. A new window can inherit a stale npm shim
    # from Node version managers such as fnm, which makes "npm run dev" fail there.
    @{ Title = "Q Labs UI"; Log = "ui"; Dir = $ui; Command = "& '$node' node_modules\next\dist\bin\next dev --webpack --port 3000" }
)
foreach ($server in $servers) {
    $log = Join-Path $logs "$($server.Log).log"
    $script = "`$Host.UI.RawUI.WindowTitle = '$($server.Title)'; Set-Location '$($server.Dir)'; $($server.Command) 2>&1 | Tee-Object -FilePath '$log'"
    $serverProcess = Start-Process $shell -ArgumentList "-NoExit", "-Command", $script -WindowStyle Hidden -PassThru
    $records += @{ Id = $serverProcess.Id; StartedAt = $serverProcess.StartTime.ToUniversalTime().ToString("o"); Name = $server.Title }
    ConvertTo-Json -InputObject @($records) | Set-Content -LiteralPath $registry
}

# Wait until everything answers
$checks = @(
    @{ Name = "API"; Log = "api"; Url = "http://127.0.0.1:8000/api/voice/status" },
    @{ Name = "Demo store"; Log = "store"; Url = "http://127.0.0.1:8120/fixed" },
    # The first request compiles the page, so this one gets a longer timeout.
    @{ Name = "UI"; Log = "ui"; Url = "http://localhost:3000/studio" }
)
foreach ($check in $checks) {
    $ready = $false
    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline -and -not $ready) {
        try { Invoke-WebRequest $check.Url -UseBasicParsing -TimeoutSec 10 | Out-Null; $ready = $true }
        catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { throw "$($check.Name) did not start. See .logs/$($check.Log).log" }
    Write-Host "$($check.Name) is up."
}

$status = Invoke-RestMethod "http://127.0.0.1:8000/api/voice/status"
if (-not $status.drafting) { Write-Warning "GROQ_API_KEY is not set, so drafting from speech is off." }
if (-not $status.live_mic) { Write-Warning "Deepgram keys are not set, so the live mic is off. Wispr Flow and typing still work." }

Start-Process "http://localhost:3000/studio"
Write-Host "Q Labs is running at http://localhost:3000. Stop it with ./dev.ps1 -Stop"
