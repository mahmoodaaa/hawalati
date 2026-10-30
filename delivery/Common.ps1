# Windows PowerShell 5.1 compatible. No machine-wide settings are changed.
Set-StrictMode -Version Latest
$script:HawalatiRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script:HawalatiProject = 'hawalati-demo'
$script:HawalatiEnv = Join-Path $script:HawalatiRoot '.env'
$script:HawalatiImages = @('hawalati-demo/backend:1.0.0', 'hawalati-demo/frontend:1.0.0', 'postgres:17-alpine')

function Invoke-DockerCapture {
    param([string[]]$DockerArgs)
    $ErrorActionPreference = 'Continue'
    $output = @(& docker @DockerArgs 2>$null)
    $code = $LASTEXITCODE
    return [pscustomobject]@{ Code = $code; Text = ($output -join "`n") }
}

function Invoke-HawalatiDocker {
    param([string[]]$DockerArgs)
    $ErrorActionPreference = 'Continue'
    & docker @DockerArgs
    if ($LASTEXITCODE -ne 0) { throw 'فشل أمر Docker. راجع الرسالة أعلاه وشغّل CHECK_SYSTEM.bat.' }
}

function Find-HawalatiDocker {
    if (Get-Command docker -ErrorAction SilentlyContinue) { return }
    foreach ($dir in @("$env:ProgramFiles\Docker\Docker\resources\bin", "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin")) {
        if (Test-Path -LiteralPath (Join-Path $dir 'docker.exe')) {
            $env:PATH = $dir + ';' + $env:PATH
            return
        }
    }
    throw 'Docker Desktop غير مثبت. ثبّته من https://www.docker.com/products/docker-desktop/ ثم أعد تشغيل الجهاز وافتح START_HAWALATI.bat. راجع START_HERE_AR.md.'
}

function Assert-HawalatiDocker {
    param([switch]$StartDesktop)
    Find-HawalatiDocker
    $compose = Invoke-DockerCapture -DockerArgs @('compose', 'version', '--short')
    if ($compose.Code -ne 0) { throw 'Docker Compose غير متوفر. حدّث Docker Desktop.' }
    $engine = Invoke-DockerCapture -DockerArgs @('info', '--format', '{{.OSType}}')
    if ($engine.Code -ne 0 -and $StartDesktop) {
        foreach ($exe in @("$env:ProgramFiles\Docker\Docker\Docker Desktop.exe", "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe")) {
            if (Test-Path -LiteralPath $exe) {
                Write-Host 'جاري تشغيل Docker Desktop. انتظر حتى يجهز المحرك...'
                Start-Process -FilePath $exe -WindowStyle Hidden
                break
            }
        }
        $deadline = (Get-Date).AddSeconds(120)
        do {
            Start-Sleep -Seconds 2
            $engine = Invoke-DockerCapture -DockerArgs @('info', '--format', '{{.OSType}}')
        } while ($engine.Code -ne 0 -and (Get-Date) -lt $deadline)
    }
    if ($engine.Code -ne 0) { throw 'Docker غير جاهز. افتح Docker Desktop وانتظر Engine running. إذا ظهرت مشكلة WSL أو Virtualization اتبع START_HERE_AR.md. لا يلزم تثبيت Ubuntu منفصلًا.' }
    if ($engine.Text.Trim() -ne 'linux') { throw 'اختر Linux containers من إعدادات Docker Desktop ثم أعد المحاولة.' }
    Write-Host ('Docker جاهز. Compose ' + $compose.Text.Trim()) -ForegroundColor Green
}

function New-HawalatiSecret {
    param([int]$Bytes = 32)
    $buffer = New-Object byte[] $Bytes
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($buffer)).Replace('-', '').ToLowerInvariant()
}

function Get-HawalatiVolumes {
    $result = Invoke-DockerCapture -DockerArgs @('volume', 'ls', '--filter', ('label=com.docker.compose.project=' + $script:HawalatiProject), '--format', '{{.Name}}')
    if ($result.Code -ne 0) { throw 'تعذر فحص وحدات تخزين حوالتي. لم يتم تغيير البيانات.' }
    return @($result.Text -split "`n" | Where-Object { $_.Trim() })
}

function Ensure-HawalatiEnvironment {
    if (-not (Test-Path -LiteralPath $script:HawalatiEnv)) {
        if (@(Get-HawalatiVolumes).Count -gt 0) {
            throw 'ملف .env مفقود مع وجود بيانات حوالتي سابقة. استعد نفس الملف من مجلد التشغيل الأصلي؛ لم ننشئ كلمات سر جديدة. استخدم RESET_DEMO.bat فقط إذا أردت حذف بيانات الديمو نهائيًا.'
        }
        $content = "DB_PASSWORD=$(New-HawalatiSecret 32)`nJWT_SECRET=$(New-HawalatiSecret 64)`nHAWALATI_HTTP_PORT=5173`n"
        try {
            $stream = [IO.File]::Open($script:HawalatiEnv, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
            try {
                $bytes = (New-Object Text.UTF8Encoding $false).GetBytes($content)
                $stream.Write($bytes, 0, $bytes.Length)
            } finally { $stream.Dispose() }
        } catch [IO.IOException] {
            if (-not (Test-Path -LiteralPath $script:HawalatiEnv)) { throw }
        }
        Write-Host 'تم تجهيز إعدادات محلية آمنة لأول تشغيل. احتفظ بملف .env ولا تشاركه.'
    }
    $settings = @{}
    foreach ($line in [IO.File]::ReadAllLines($script:HawalatiEnv)) {
        if ($line -match '^([A-Z_]+)=(.*)$') { $settings[$matches[1]] = $matches[2] }
    }
    if (-not $settings.ContainsKey('DB_PASSWORD') -or $settings['DB_PASSWORD'] -notmatch '^[a-f0-9]{64}$' -or
        -not $settings.ContainsKey('JWT_SECRET') -or $settings['JWT_SECRET'] -notmatch '^[a-f0-9]{128}$') {
        throw 'ملف .env غير صالح لهذا الباكج. لا تحذف ملف إعدادات مرتبطًا ببيانات محفوظة؛ استعد الملف الأصلي.'
    }
    $port = 5173
    if ($settings.ContainsKey('HAWALATI_HTTP_PORT')) {
        if (-not [int]::TryParse($settings['HAWALATI_HTTP_PORT'], [ref]$port) -or $port -lt 1024 -or $port -gt 65535) {
            throw 'رقم منفذ حوالتي في .env غير صالح.'
        }
    }
    # Compose prioritizes inherited shell variables over --env-file. Use this
    # package's own settings consistently, without changing the user's machine.
    $env:DB_PASSWORD = $settings['DB_PASSWORD']
    $env:JWT_SECRET = $settings['JWT_SECRET']
    $env:HAWALATI_HTTP_PORT = [string]$port
    return $port
}

function Get-HawalatiComposeArgs {
    return @('compose', '--project-name', $script:HawalatiProject, '--project-directory', $script:HawalatiRoot,
        '--env-file', $script:HawalatiEnv, '-f', (Join-Path $script:HawalatiRoot 'docker-compose.yml'))
}

function Test-HawalatiImage {
    param([string]$Image)
    return (Invoke-DockerCapture -DockerArgs @('image', 'inspect', $Image)).Code -eq 0
}

function Import-HawalatiImages {
    $archive = Join-Path $script:HawalatiRoot 'images\hawalati-images.tar'
    $manifest = Join-Path $script:HawalatiRoot 'images\images.json'
    if (-not (Test-Path -LiteralPath $archive)) { return }
    if (-not (Test-Path -LiteralPath $manifest)) { throw 'ملف فحص صور Docker مفقود. أعد استخراج الباكج كاملًا.' }
    Write-Host 'جاري فحص صور Docker المرفقة؛ قد يستغرق ذلك قليلًا...'
    $metadata = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
    $hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
    if ($hash -ne $metadata.sha256) { throw 'ملف صور Docker غير مكتمل أو تالف. أعد نسخ الباكج واستخراجه.' }
    $marker = Join-Path $script:HawalatiRoot 'images\.loaded-sha'
    $loaded = (Test-Path -LiteralPath $marker) -and ((Get-Content -LiteralPath $marker -Raw).Trim() -eq $hash)
    $missing = @($script:HawalatiImages | Where-Object { -not (Test-HawalatiImage $_) })
    if (-not $loaded -or $missing.Count -gt 0) {
        Write-Host 'جاري تجهيز صور Docker المحلية لأول تشغيل؛ لا تغلق النافذة...'
        Invoke-HawalatiDocker -DockerArgs @('load', '--input', $archive)
        foreach ($image in $script:HawalatiImages) {
            if (-not (Test-HawalatiImage $image)) { throw 'الباكج لا يحتوي جميع الصور المطلوبة. اطلب نسخة مكتملة.' }
        }
        [IO.File]::WriteAllText($marker, $hash)
    }
}

function Start-Hawalati {
    param([switch]$NoBrowser)
    Assert-HawalatiDocker -StartDesktop
    $port = Ensure-HawalatiEnvironment
    $compose = @(Get-HawalatiComposeArgs)
    Import-HawalatiImages
    $missing = @($script:HawalatiImages[0..1] | Where-Object { -not (Test-HawalatiImage $_) })
    if ($missing.Count -gt 0) {
        $buildFile = Join-Path $script:HawalatiRoot 'docker-compose.build.yml'
        if (-not (Test-Path -LiteralPath $buildFile)) { throw 'صور التطبيق غير موجودة. استخرج Hawalati-Demo.zip كاملًا بما فيه مجلد images.' }
        Write-Host 'هذه نسخة السورس. أول تجهيز يحتاج إنترنت وقد يستغرق عدة دقائق؛ المرات التالية تستخدم الصور المحفوظة.'
        Invoke-HawalatiDocker -DockerArgs ($compose + @('-f', $buildFile, 'build'))
    }
    Write-Host 'جاري تشغيل قاعدة البيانات ثم الخادم والواجهة...'
    Invoke-HawalatiDocker -DockerArgs ($compose + @('up', '-d', '--wait', '--wait-timeout', '240'))
    $url = 'http://localhost:' + $port
    $frontend = Invoke-WebRequest -Uri ($url + '/healthz') -UseBasicParsing -TimeoutSec 15
    $backend = Invoke-RestMethod -Uri ($url + '/v3/api-docs') -TimeoutSec 30
    if ($frontend.StatusCode -ne 200 -or -not $backend.openapi) { throw 'الخدمات بدأت لكن الاتصال لم يجهز. شغّل CHECK_SYSTEM.bat.' }
    Write-Host ('حوالتي جاهز: ' + $url) -ForegroundColor Green
    Write-Host 'لإيقافه مع حفظ البيانات: STOP_HAWALATI.bat'
    if (-not $NoBrowser) { Start-Process -FilePath $url }
}

function Stop-Hawalati {
    Assert-HawalatiDocker
    if (-not (Test-Path -LiteralPath $script:HawalatiEnv)) {
        Write-Host 'لم نجد إعدادات تشغيل في هذا المجلد. استخدم STOP من نفس المجلد الذي شغّلت منه حوالتي.'
        return
    }
    $null = Ensure-HawalatiEnvironment
    Invoke-HawalatiDocker -DockerArgs (@(Get-HawalatiComposeArgs) + @('down'))
    Write-Host 'تم الإيقاف. الحسابات والعمليات والوثائق محفوظة.' -ForegroundColor Green
}

function Reset-Hawalati {
    Assert-HawalatiDocker
    Write-Host 'سيتم حذف جميع حسابات وعمليات ووثائق ديمو حوالتي على هذا الجهاز. لا يوجد تراجع.' -ForegroundColor Yellow
    $confirmation = Read-Host 'للتأكيد اكتب RESET HAWALATI، أو اضغط Enter للإلغاء'
    if ($confirmation -cne 'RESET HAWALATI') { Write-Host 'تم الإلغاء؛ لم نحذف أي بيانات.'; return }
    # Check ownership BEFORE stopping services or deleting either volume.
    $volumes = @(($script:HawalatiProject + '_database'), ($script:HawalatiProject + '_documents'))
    $owned = @()
    foreach ($volume in $volumes) {
        $inspection = Invoke-DockerCapture -DockerArgs @('volume', 'inspect', $volume)
        if ($inspection.Code -ne 0) { continue }
        $info = @($inspection.Text | ConvertFrom-Json)[0]
        if ($null -eq $info.Labels -or $info.Labels.'com.docker.compose.project' -ne $script:HawalatiProject) {
            throw ('رفض حذف وحدة تخزين لا تحمل ملكية مشروع حوالتي: ' + $volume)
        }
        $owned += $volume
    }
    # Even if .env was lost, only containers belonging to our fixed project are stopped.
    $containers = Invoke-DockerCapture -DockerArgs @('ps', '-aq', '--filter', ('label=com.docker.compose.project=' + $script:HawalatiProject))
    if ($containers.Code -ne 0) { throw 'تعذر فحص الحاويات؛ لم نحذف وحدات التخزين.' }
    $ids = @($containers.Text -split "`n" | Where-Object { $_ -match '^[a-f0-9]{12,64}$' })
    if ($ids.Count -gt 0) { Invoke-HawalatiDocker -DockerArgs (@('rm', '--force') + $ids) }
    foreach ($volume in $owned) { Invoke-HawalatiDocker -DockerArgs @('volume', 'rm', $volume) }
    Write-Host 'تمت إعادة ضبط الديمو. افتح START_HAWALATI.bat ثم سجّل حسابًا جديدًا. امسح جلسة المتصفح القديمة بتسجيل الخروج.' -ForegroundColor Green
}

function Show-HawalatiSystem {
    Assert-HawalatiDocker
    Invoke-HawalatiDocker -DockerArgs @('version', '--format', 'Docker Engine: {{.Server.Version}}')
    if (Test-Path -LiteralPath $script:HawalatiEnv) {
        $null = Ensure-HawalatiEnvironment
        Invoke-HawalatiDocker -DockerArgs (@(Get-HawalatiComposeArgs) + @('ps', '--all'))
    }
    Write-Host 'إذا كان المنفذ 5173 مشغولًا، أغلق نسخة التطوير السابقة ثم شغّل START مجددًا.'
    Write-Host 'إيقاف Docker أو إعادة تشغيل الجهاز لا يحذف البيانات. لا تستخدم Reset أو حذف Docker Volumes إلا إذا أردت مسح الديمو.'
}
