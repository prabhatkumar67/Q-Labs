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

function Stop-Port($port) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# Uvicorn workers can outlive their parent on Windows and keep serving old code on the same port.
function Stop-Servers {
    $ports.Values | ForEach-Object { Stop-Port $_ }
    $all = Get-CimInstance Win32_Process
    $alive = @{}
    $all | ForEach-Object { $alive[$_.ProcessId] = $true }
    $all | Where-Object {
        $_.CommandLine -match "uvicorn app\.(main|acceptance_demo):app" -or
        ($_.CommandLine -match "multiprocessing-fork" -and -not $alive[$_.ParentProcessId])
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
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
        & $python -m pip install --quiet -r (Join-Path $api "requirements-sqlite.txt")
        & $python -m playwright install chromium
    }
}
if (-not (Test-Path $python)) { throw "Python not found at $python. Set QLABS_PYTHON or install Python 3.13." }

# Next.js keeps a few hundred MB of dev cache next to the UI; a full drive makes it fail in confusing ways.
$drive = Get-PSDrive -Name (Split-Path $root -Qualifier).TrimEnd(":") -ErrorAction SilentlyContinue
if ($drive -and $drive.Free -lt 1GB) {
    Write-Warning ("Only {0:N0} MB free on {1}:. The UI dev server needs about 1 GB. Free some space if the UI fails to start." -f ($drive.Free / 1MB), $drive.Name)
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
    npm ci --ignore-scripts --no-audit --no-fund
    Pop-Location
}

# Servers, each in its own window, with output also written to .logs/ so a failed start can be diagnosed
Stop-Servers
$logs = Join-Path $root ".logs"
New-Item -ItemType Directory -Force $logs | Out-Null
$shell = (Get-Process -Id $PID).Path
$servers = @(
    @{ Title = "Q Labs API"; Log = "api"; Dir = $api; Command = "& '$python' -m uvicorn app.main:app --host 127.0.0.1 --port 8000" },
    @{ Title = "Q Labs demo store"; Log = "store"; Dir = $api; Command = "& '$python' -m uvicorn app.acceptance_demo:app --host 127.0.0.1 --port 8120" },
    # Next is started with this session's node directly. A new window can inherit a stale npm shim
    # from Node version managers such as fnm, which makes "npm run dev" fail there.
    @{ Title = "Q Labs UI"; Log = "ui"; Dir = $ui; Command = "& '$node' node_modules\next\dist\bin\next dev --port 3000" }
)
foreach ($server in $servers) {
    $log = Join-Path $logs "$($server.Log).log"
    $script = "`$Host.UI.RawUI.WindowTitle = '$($server.Title)'; Set-Location '$($server.Dir)'; $($server.Command) 2>&1 | Tee-Object -FilePath '$log'"
    Start-Process $shell -ArgumentList "-NoExit", "-Command", $script -WindowStyle Minimized
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
    for ($i = 0; $i -lt 90 -and -not $ready; $i++) {
        try { Invoke-WebRequest $check.Url -UseBasicParsing -TimeoutSec 60 | Out-Null; $ready = $true }
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
