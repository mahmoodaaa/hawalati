# Tests temporary settings and mocked Docker commands, never real user volumes.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Common.ps1')
$temporaryBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$fixture = Join-Path $temporaryBase ('hawalati-launcher-test-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture | Out-Null
$savedEnvironment = @($env:DB_PASSWORD, $env:JWT_SECRET, $env:HAWALATI_HTTP_PORT)
$passed = 0
function Assert-Check { param([bool]$Condition, [string]$Name) if (-not $Condition) { throw ('FAIL: ' + $Name) }; $script:passed++; Write-Host ('PASS: ' + $Name) }
function Assert-Throws { param([scriptblock]$Code, [string]$Name) $threw = $false; try { & $Code | Out-Null } catch { $threw = $true }; Assert-Check $threw $Name }
try {
    $script:HawalatiRoot = $fixture
    $script:HawalatiEnv = Join-Path $fixture '.env'
    $script:mockVolumes = @()
    function Get-HawalatiVolumes { return $script:mockVolumes }
    $port = Ensure-HawalatiEnvironment
    $text = [IO.File]::ReadAllText($script:HawalatiEnv)
    Assert-Check ($port -eq 5173 -and $text -match 'DB_PASSWORD=[a-f0-9]{64}' -and $text -match 'JWT_SECRET=[a-f0-9]{128}') 'First-run cryptographic settings have the required lengths.'
    $hash = (Get-FileHash -LiteralPath $script:HawalatiEnv).Hash
    $env:DB_PASSWORD = 'conflicting-shell-password'
    $null = Ensure-HawalatiEnvironment
    Assert-Check ((Get-FileHash -LiteralPath $script:HawalatiEnv).Hash -eq $hash -and $env:DB_PASSWORD -match '^[a-f0-9]{64}$') 'Restart preserves secrets and ignores conflicting shell credentials.'
    [IO.File]::WriteAllText($script:HawalatiEnv, 'DB_PASSWORD=invalid')
    Assert-Throws { Ensure-HawalatiEnvironment } 'Invalid .env is rejected without replacement.'
    Remove-Item -LiteralPath $script:HawalatiEnv
    $script:mockVolumes = @('hawalati-demo_database')
    Assert-Throws { Ensure-HawalatiEnvironment } 'A missing .env with existing data cannot silently rotate secrets.'
    function Assert-HawalatiDocker {}
    $script:mutations = @()
    function Invoke-HawalatiDocker { param([string[]]$DockerArgs) $script:mutations += ,$DockerArgs }
    function Read-Host { param([string]$Prompt) return '' }
    Reset-Hawalati
    Assert-Check ($script:mutations.Count -eq 0) 'Unconfirmed Reset makes no Docker mutations.'
    function Read-Host { param([string]$Prompt) return 'RESET HAWALATI' }
    function Invoke-DockerCapture { param([string[]]$DockerArgs) return [pscustomobject]@{ Code = 0; Text = '[{"Labels":{"com.docker.compose.project":"different-project"}}]' } }
    Assert-Throws { Reset-Hawalati } 'Reset refuses foreign-owned volumes before mutation.'
    Assert-Check ($script:mutations.Count -eq 0) 'Ownership rejection does not stop containers or remove data.'
    function Invoke-DockerCapture {
        param([string[]]$DockerArgs)
        if ($DockerArgs[0] -eq 'volume') { return [pscustomobject]@{ Code = 0; Text = '[{"Labels":{"com.docker.compose.project":"hawalati-demo"}}]' } }
        return [pscustomobject]@{ Code = 0; Text = 'aabbcc112233' }
    }
    Reset-Hawalati
    Assert-Check ($script:mutations.Count -eq 3 -and ($script:mutations[0] -join ' ') -eq 'rm --force aabbcc112233' -and ($script:mutations[1] -join ' ') -eq 'volume rm hawalati-demo_database' -and ($script:mutations[2] -join ' ') -eq 'volume rm hawalati-demo_documents') 'Confirmed Reset targets only the two fixed owned volumes and project containers.'
    New-Item -ItemType Directory -Path (Join-Path $fixture 'images') | Out-Null
    [IO.File]::WriteAllText((Join-Path $fixture 'images\hawalati-images.tar'), 'invalid-archive')
    [IO.File]::WriteAllText((Join-Path $fixture 'images\images.json'), '{"sha256":"wrong"}')
    $script:mutations = @()
    Assert-Throws { Import-HawalatiImages } 'Corrupt image archives are rejected.'
    Assert-Check ($script:mutations.Count -eq 0) 'Checksum rejection does not load Docker images.'
    Write-Host ($passed.ToString() + ' launcher checks passed.') -ForegroundColor Green
} finally {
    $env:DB_PASSWORD = $savedEnvironment[0]
    $env:JWT_SECRET = $savedEnvironment[1]
    $env:HAWALATI_HTTP_PORT = $savedEnvironment[2]
    $resolvedFixture = [IO.Path]::GetFullPath($fixture)
    if (-not $resolvedFixture.StartsWith($temporaryBase, [StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path $resolvedFixture -Leaf) -notlike 'hawalati-launcher-test-*') { throw 'Unsafe temporary cleanup path' }
    Remove-Item -LiteralPath $resolvedFixture -Recurse -Force
}
