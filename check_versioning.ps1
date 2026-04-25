$ErrorActionPreference = "Stop"

$moduleFiles = @(
  "core/collectAtags.js",
  "core/exportAtags.js",
  "core/helpers.js",
  "core/restoreAtags.js",
  "addons/tagPairParser.js",
  "addons/globalFieldSync.js",
  "addons/timeMarker.js"
)

function Get-VersionLine {
  param(
    [string]$Content,
    [string]$Path
  )

  $match = [regex]::Match($Content, '(?m)^[^\r\n]* v(\d+\.\d+) \(sys (\d+\.\d+)\)$')
  if (-not $match.Success) {
    throw "Keine Versionszeile im erwarteten Format gefunden: $Path"
  }

  return [pscustomobject]@{
    Raw = $match.Value
    Version = [version]($match.Groups[1].Value)
    SysVersion = [version]($match.Groups[2].Value)
  }
}

$changedFiles = @(
  git diff --name-only HEAD
  git ls-files --others --exclude-standard
)
$changedModules = @($changedFiles | Where-Object { $moduleFiles -contains $_ })

if ($changedModules.Count -eq 0) {
  Write-Host "OK: Keine geänderten Moduldateien gefunden."
  exit 0
}

$errors = @()

foreach ($path in $changedModules) {
  $currentContent = Get-Content -Raw -Path $path
  $current = Get-VersionLine -Content $currentContent -Path $path

  $oldContent = $null
  try {
    $oldContent = git show ("HEAD:" + $path) 2>$null
  } catch {
    $oldContent = $null
  }

  if ($LASTEXITCODE -ne 0 -or -not $oldContent) {
    # Neues oder umbenanntes Modul ohne direkten HEAD-Pfad:
    # Changelog bleibt Pflicht, aber ein Versionsvergleich ist hier nicht möglich.
    continue
  }

  $previous = $null
  try {
    $previous = Get-VersionLine -Content ($oldContent -join "`n") -Path ("HEAD:" + $path)
  } catch {
    # Alte Module konnten vor der Aufnahme in die Prüfung noch ein abweichendes
    # Headerformat haben. Die aktuelle Datei wurde oben bereits geprüft.
    continue
  }

  if ($current.Version -le $previous.Version -and $current.SysVersion -le $previous.SysVersion) {
    $errors += "$path wurde geändert, aber weder Datei- noch Systemversion wurde erhöht ($($previous.Raw) -> $($current.Raw))."
  }
}

if (-not ($changedFiles -contains "CHANGELOG.md")) {
  $errors += "CHANGELOG.md wurde nicht geändert, obwohl Moduldateien geändert wurden."
}

if ($errors.Count -gt 0) {
  Write-Host "FEHLER:"
  $errors | ForEach-Object { Write-Host "- $_" }
  exit 1
}

Write-Host "OK: Versionen und Changelog sind konsistent."
