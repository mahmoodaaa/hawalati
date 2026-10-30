param(
    [Parameter(Mandatory = $true)][ValidateSet('Start', 'Stop', 'Check', 'Reset')][string]$Action,
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding $false
. (Join-Path $PSScriptRoot 'Common.ps1')
$transcript = $false
try {
    $logDirectory = Join-Path $script:HawalatiRoot 'logs'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    Start-Transcript -Path (Join-Path $logDirectory ($Action + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')) | Out-Null
    $transcript = $true
    switch ($Action) {
        'Start' { Start-Hawalati -NoBrowser:$NoBrowser }
        'Stop' { Stop-Hawalati }
        'Check' { Show-HawalatiSystem }
        'Reset' { Reset-Hawalati }
    }
} catch {
    Write-Host ''
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'راجع START_HERE_AR.md. احتفظ بنافذة الخطأ أو سجل logs للمساعدة؛ لا ترسل ملف .env.'
    exit 1
} finally {
    if ($transcript) { Stop-Transcript | Out-Null }
}
