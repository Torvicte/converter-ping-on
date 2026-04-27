$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $appRoot "dist\win-unpacked\Converter Ping On.exe"
$startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Converter Ping On"
$shortcutPath = Join-Path $startMenuDir "Converter Ping On.lnk"

if (-not (Test-Path $target)) {
  throw "No se encontro el ejecutable en $target"
}

New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = Split-Path -Parent $target
$shortcut.IconLocation = $target
$shortcut.Description = "Converter Ping On"
$shortcut.Save()

Write-Host "Acceso directo creado en: $shortcutPath"
