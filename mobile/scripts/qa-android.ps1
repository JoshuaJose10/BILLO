[CmdletBinding()]
param(
    [ValidateSet('estado', 'espejo', 'captura', 'instalar')]
    [string]$Accion = 'estado',
    [string]$Dispositivo,
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$')]
    [string]$Caso,
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$')]
    [string]$Paso = 'resultado',
    [string]$Apk
)

$ErrorActionPreference = 'Stop'

function Find-QaTool([string]$Name) {
    $command = Get-Command "$Name.exe" -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    if ($Name -eq 'adb') {
        foreach ($sdkRoot in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT,
                (Join-Path $env:LOCALAPPDATA 'Android\Sdk'))) {
            if ($sdkRoot) {
                $candidate = Join-Path $sdkRoot 'platform-tools\adb.exe'
                if (Test-Path -LiteralPath $candidate) { return $candidate }
            }
        }
    }

    $packages = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    if (Test-Path -LiteralPath $packages) {
        $roots = Get-ChildItem -LiteralPath $packages -Directory |
            Where-Object { $_.Name -like 'Genymobile.scrcpy_*' -or $_.Name -like 'Google.PlatformTools_*' }
        foreach ($root in $roots) {
            $candidate = Get-ChildItem -LiteralPath $root.FullName -Recurse -File -Filter "$Name.exe" |
                Select-Object -First 1
            if ($candidate) { return $candidate.FullName }
        }
    }
    throw "Falta $Name. Consulta docs/qa/hu79-entorno-android.md."
}

$qaAdb = Find-QaTool 'adb'

function Invoke-QaAdb([string[]]$Argumentos) {
    & $qaAdb -s $script:qaSerial @Argumentos
    if ($LASTEXITCODE -ne 0) {
        throw "ADB fallo ($LASTEXITCODE): $($Argumentos[0])."
    }
}

try {
    $deviceLines = @(& $qaAdb devices -l)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar ADB.' }
    $devices = @($deviceLines | ForEach-Object {
        if ($_ -match '^(\S+)\s+(device|unauthorized|offline)\b') {
            [PSCustomObject]@{ Serial = $Matches[1]; Estado = $Matches[2] }
        }
    })

    if ($Accion -eq 'estado') {
        & $qaAdb version
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar ADB.' }
        $qaScrcpy = Find-QaTool 'scrcpy'
        & $qaScrcpy --version
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar scrcpy.' }
        $deviceLines | Write-Host
    }

    if ($Dispositivo) {
        $selected = @($devices | Where-Object { $_.Serial -eq $Dispositivo })
    } else {
        $selected = $devices
    }
    if ($selected.Count -eq 0) {
        throw 'No se detecta el telefono. Conecta un cable de datos y activa Depuracion USB.'
    }
    if ($selected.Count -gt 1) {
        throw 'Hay varios dispositivos. Indica -Dispositivo con el identificador de adb devices -l.'
    }
    if ($selected[0].Estado -eq 'unauthorized') {
        throw 'Desbloquea el telefono y acepta Permitir depuracion USB. Si no aparece, reconecta el cable.'
    }
    if ($selected[0].Estado -ne 'device') {
        throw 'El telefono esta offline. Desbloquealo y reconecta el cable.'
    }
    $script:qaSerial = $selected[0].Serial

    switch ($Accion) {
        'estado' {
            Write-Host 'Conexion autorizada. Datos del dispositivo:'
            Invoke-QaAdb -Argumentos @('shell', 'getprop', 'ro.product.manufacturer')
            Invoke-QaAdb -Argumentos @('shell', 'getprop', 'ro.product.model')
            Invoke-QaAdb -Argumentos @('shell', 'getprop', 'ro.build.version.release')
            $package = @(Invoke-QaAdb -Argumentos @('shell', 'pm', 'list', 'packages', 'com.billo.app'))
            if (-not ($package -match '^package:')) {
                Write-Host 'Billo (com.billo.app) no esta instalado.'
            } else {
                Write-Host 'Billo instalado:'
                Invoke-QaAdb -Argumentos @('shell', 'dumpsys', 'package', 'com.billo.app') |
                    Select-String 'versionCode=|versionName=|firstInstallTime=|lastUpdateTime='
            }
        }
        'espejo' {
            $qaScrcpy = Find-QaTool 'scrcpy'
            & $qaScrcpy --serial $script:qaSerial --no-audio
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar scrcpy.' }
        }
        'captura' {
            if (-not $Caso) { throw 'Indica -Caso, por ejemplo CP-HU71-01.' }
            $repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
            $folder = Join-Path $repoRoot "docs\qa\hu79-evidencias\$Caso"
            New-Item -ItemType Directory -Path $folder -Force | Out-Null
            $stamp = [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
            $name = "$Paso-$stamp-$([Guid]::NewGuid().ToString('N').Substring(0, 6)).png"
            $remote = "/sdcard/billo-qa-$name"
            $destination = Join-Path $folder $name
            Invoke-QaAdb -Argumentos @('shell', 'screencap', '-p', $remote)
            try {
                Invoke-QaAdb -Argumentos @('pull', $remote, $destination)
                $signature = [BitConverter]::ToString(([IO.File]::ReadAllBytes($destination))[0..7])
                if ($signature -ne '89-50-4E-47-0D-0A-1A-0A') { throw 'La captura no es un PNG valido.' }
            } finally {
                Invoke-QaAdb -Argumentos @('shell', 'rm', $remote)
            }
            Write-Host "Captura guardada: $destination"
        }
        'instalar' {
            if (-not $Apk -or -not (Test-Path -LiteralPath $Apk -PathType Leaf)) {
                throw 'Indica -Apk con la ruta de un archivo APK existente.'
            }
            $apkFile = Get-Item -LiteralPath $Apk
            if ($apkFile.Extension -ne '.apk') { throw 'El archivo debe tener extension .apk.' }
            Get-FileHash -Algorithm SHA256 -LiteralPath $apkFile.FullName
            Invoke-QaAdb -Argumentos @('install', '-r', $apkFile.FullName)
        }
    }
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
}
