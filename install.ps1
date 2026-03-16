# MOD Group PMO App — Installazione + Avvio
$Host.UI.RawUI.WindowTitle = "MOD Group PMO App — Installazione"
Set-Location $PSScriptRoot

function Write-Bar {
    param([int]$Pct, [int]$Width = 40)
    $filled = [math]::Round($Width * $Pct / 100)
    $empty  = $Width - $filled
    $bar    = "[" + ("█" * $filled) + ("░" * $empty) + "] $Pct%"
    Write-Host "`r  $bar" -NoNewline -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Green
Write-Host "    MOD Group PMO App — Installazione" -ForegroundColor Green
Write-Host "  ================================================" -ForegroundColor Green
Write-Host ""

# ── 1. Node.js ───────────────────────────────────────────────
Write-Host "  [1/3] Verifica Node.js..." -ForegroundColor Cyan
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host ""
    Write-Host "  ERRORE: Node.js non trovato." -ForegroundColor Red
    Write-Host "  Vai su https://nodejs.org, installa la versione LTS, riavvia il PC." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Premi INVIO per uscire"
    exit 1
}
$nodeVersion = & node --version
Write-Host "  [OK] Node.js $nodeVersion" -ForegroundColor Green

# ── 2. npm install con barra avanzamento ─────────────────────
Write-Host ""
Write-Host "  [2/3] Installazione dipendenze npm..." -ForegroundColor Cyan
Write-Host "  (Prima volta: 2-4 minuti)" -ForegroundColor Gray
Write-Host ""

Write-Bar 0
$job = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    & npm install 2>&1
} -ArgumentList $PSScriptRoot

# Stima avanzamento sul tempo (npm install ~120s tipico)
$totalSec = 120
$elapsed  = 0
while ($job.State -eq 'Running') {
    Start-Sleep -Seconds 1
    $elapsed++
    $pct = [math]::Min([math]::Round($elapsed / $totalSec * 95), 95)
    Write-Bar $pct
}

$output = Receive-Job $job
Remove-Job $job

if ($LASTEXITCODE -ne 0 -and ($output -match "error")) {
    Write-Host ""
    Write-Host ""
    Write-Host "  ERRORE: npm install fallito." -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    Read-Host "  Premi INVIO per uscire"
    exit 1
}

Write-Bar 100
Write-Host ""
Write-Host ""
Write-Host "  [OK] Dipendenze installate" -ForegroundColor Green

# ── 3. Avvio server ──────────────────────────────────────────
Write-Host ""
Write-Host "  [3/3] Avvio server Next.js..." -ForegroundColor Cyan
Write-Host ""

Write-Bar 0

$serverJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    & npx next dev 2>&1
} -ArgumentList $PSScriptRoot

# Polling porta 3000 (max 60s)
$ready   = $false
$elapsed = 0
while (-not $ready -and $elapsed -lt 60) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $pct = [math]::Min([math]::Round($elapsed / 60 * 99), 99)
    Write-Bar $pct
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $ready = $true }
    } catch { }
}

Write-Bar 100
Write-Host ""
Write-Host ""

if ($ready) {
    Write-Host "  [OK] App pronta su http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Timeout — apro il browser comunque" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Green
Write-Host "    Installazione completata!" -ForegroundColor Green
Write-Host "  ================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Apertura browser..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "  Server attivo. Tieni questa finestra aperta." -ForegroundColor White
Write-Host "  Per fermare: chiudi questa finestra o CTRL+C" -ForegroundColor Gray
Write-Host ""

# Mantieni server in foreground
Receive-Job $serverJob -Wait
