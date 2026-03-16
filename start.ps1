# MOD Group PMO App — Avvio
$Host.UI.RawUI.WindowTitle = "MOD Group PMO App"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Green
Write-Host "    MOD Group PMO App" -ForegroundColor Green
Write-Host "  ================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Avvio server in corso..." -ForegroundColor Cyan
Write-Host "  (attendere 20-30 secondi)" -ForegroundColor Gray
Write-Host ""

# Avvia next dev in background
$job = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    & npx next dev 2>&1
} -ArgumentList $PSScriptRoot

# Aspetta che la porta 3000 risponda (max 60 secondi)
$ready = $false
$elapsed = 0
while (-not $ready -and $elapsed -lt 60) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) { $ready = $true }
    } catch { }
    Write-Host "  [$elapsed s] In attesa..." -ForegroundColor Gray
}

if ($ready) {
    Write-Host ""
    Write-Host "  [OK] App pronta!" -ForegroundColor Green
    Write-Host "  Apertura browser su http://localhost:3000" -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
} else {
    Write-Host ""
    Write-Host "  [WARN] Timeout — apro il browser comunque" -ForegroundColor Yellow
    Start-Process "http://localhost:3000"
}

Write-Host ""
Write-Host "  Server attivo. Tieni questa finestra aperta." -ForegroundColor White
Write-Host "  Per fermare: chiudi questa finestra o premi CTRL+C" -ForegroundColor Gray
Write-Host ""

# Mantieni il job in foreground
Receive-Job $job -Wait
