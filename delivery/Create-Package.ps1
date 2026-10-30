# Maintainer tool. The business owner only uses START/STOP/CHECK/RESET.
param([ValidateSet('Prebuilt', 'Source')][string]$Mode = 'Prebuilt', [switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Common.ps1')
try {
    $release = Join-Path $script:HawalatiRoot 'release'
    $runId = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 6)
    $staging = Join-Path $release ('.staging\' + $runId)
    $package = Join-Path $staging 'Hawalati-Demo'
    New-Item -ItemType Directory -Path $package -Force | Out-Null
    $runtimeFiles = @('START_HAWALATI.bat', 'STOP_HAWALATI.bat', 'CHECK_SYSTEM.bat', 'RESET_DEMO.bat',
        'START_HERE_AR.md', 'START_HERE_AR.html', 'DEMO_GUIDE.md', 'docker-compose.yml',
        'delivery\Common.ps1', 'delivery\Hawalati.ps1', 'delivery\README.md', 'delivery\DEMO_DOCUMENT.png')
    foreach ($relative in $runtimeFiles) {
        $destination = Join-Path $package $relative
        New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $script:HawalatiRoot $relative) -Destination $destination
    }
    # Never copy a working tree wholesale: it may contain local credentials,
    # uploaded documents, developer accounts, node_modules or database dumps.
    if ($Mode -eq 'Source') {
        $sourceFiles = @('docker-compose.build.yml', 'frontend\Dockerfile', 'frontend\.dockerignore',
            'frontend\package.json', 'frontend\package-lock.json', 'frontend\index.html', 'frontend\vite.config.js',
            'hawalati-backend\Dockerfile', 'hawalati-backend\.dockerignore', 'hawalati-backend\pom.xml')
        foreach ($relative in $sourceFiles) {
            $destination = Join-Path $package $relative
            New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
            Copy-Item -LiteralPath (Join-Path $script:HawalatiRoot $relative) -Destination $destination
        }
        foreach ($directory in @('frontend\src', 'frontend\public', 'frontend\docker', 'hawalati-backend\src\main', 'hawalati-backend\docker')) {
            $source = Join-Path $script:HawalatiRoot $directory
            foreach ($file in Get-ChildItem -LiteralPath $source -File -Recurse -Force) {
                $relative = $file.FullName.Substring($script:HawalatiRoot.Length + 1)
                if ($relative -eq 'hawalati-backend\src\main\resources\application.properties') { continue }
                if ($file.Name -match '^\.env' -or $file.Extension -match '^\.(pem|key|p12|pfx|jks|keystore|dump|backup)$') { continue }
                $destination = Join-Path $package $relative
                New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
                Copy-Item -LiteralPath $file.FullName -Destination $destination
            }
        }
        $cleanConfig = Join-Path $package 'hawalati-backend\src\main\resources\application.properties'
        New-Item -ItemType Directory -Path (Split-Path $cleanConfig -Parent) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $script:HawalatiRoot 'hawalati-backend\docker\application.properties') -Destination $cleanConfig
        $name = 'Hawalati-Demo-source-' + $runId + '.zip'
        Write-Host 'Source package: first launch needs internet and Docker builds.'
    } else {
        Assert-HawalatiDocker -StartDesktop
        if (-not $SkipBuild) {
            $buildEnv = Join-Path $staging 'build.env'
            [IO.File]::WriteAllText($buildEnv, "DB_PASSWORD=$(New-HawalatiSecret 32)`nJWT_SECRET=$(New-HawalatiSecret 64)`n", (New-Object Text.UTF8Encoding $false))
            Invoke-HawalatiDocker -DockerArgs @('compose', '--project-name', 'hawalati-package-build', '--project-directory', $script:HawalatiRoot,
                '--env-file', $buildEnv, '-f', (Join-Path $script:HawalatiRoot 'docker-compose.yml'),
                '-f', (Join-Path $script:HawalatiRoot 'docker-compose.build.yml'), 'build')
        }
        if (-not (Test-HawalatiImage 'postgres:17-alpine')) {
            Invoke-HawalatiDocker -DockerArgs @('pull', '--platform', 'linux/amd64', 'postgres:17-alpine')
        }
        foreach ($image in $script:HawalatiImages) {
            if (-not (Test-HawalatiImage $image)) { throw ('Missing image: ' + $image) }
        }
        $imagesDirectory = Join-Path $package 'images'
        New-Item -ItemType Directory -Path $imagesDirectory -Force | Out-Null
        $archive = Join-Path $imagesDirectory 'hawalati-images.tar'
        Write-Host 'Saving prebuilt application and database images. This does not export any running container or volume.'
        Invoke-HawalatiDocker -DockerArgs (@('save', '--output', $archive) + $script:HawalatiImages)
        $manifest = @{ sha256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash; images = $script:HawalatiImages; platform = 'linux/amd64'; created = (Get-Date).ToUniversalTime().ToString('o') }
        [IO.File]::WriteAllText((Join-Path $imagesDirectory 'images.json'), ($manifest | ConvertTo-Json), (New-Object Text.UTF8Encoding $false))
        $name = 'Hawalati-Demo-' + $runId + '.zip'
    }
    # .NET compression supports large image archives without PowerShell's
    # Compress-Archive file-size limitations. Existing packages are not deleted.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = Join-Path $release $name
    Write-Host 'Creating ZIP; wait until the success message...'
    [IO.Compression.ZipFile]::CreateFromDirectory($staging + '\Hawalati-Demo', $zip, [IO.Compression.CompressionLevel]::Optimal, $true)
    if ($Mode -eq 'Prebuilt') {
        $latest = Join-Path $release 'Hawalati-Demo.zip'
        Copy-Item -LiteralPath $zip -Destination $latest -Force
        Write-Host ('Ready to deliver: ' + $latest) -ForegroundColor Green
    } else { Write-Host ('Ready: ' + $zip) -ForegroundColor Green }
    Write-Host 'No .env, user documents, database volume, Git credentials or developer tools are included.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
