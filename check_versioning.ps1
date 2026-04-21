$ErrorActionPreference = "Stop"

$moduleFiles = @(
  "collectAtags.js",
  "exportAtags.js",
  "helpers.js",
  "restoreAtags.js"
)

function Get-VersionLine {
  param(
    [string]$Content,
    [string]$Path
  )

  $match = [regex]::Match($Content, '(?m)^[^\r\n]* v(\d+\.\d+) \(sys \d+\.\d+\)$')
  if (-not $match.Success) {
    throw "Keine Versionszeile im erwarteten Format gefunden: $Path"
  }

  return [pscustomobject]@{
    Raw = $match.Value
    Version = [version]($match.Groups[1].Value)
  }
}

$changedFiles = @(git diff --name-only HEAD)
$changedModules = @($changedFiles | Where-Object { $moduleFiles -contains $_ })

if ($changedModules.Count -eq 0) {
  Write-Host "OK: Keine geänderten Moduldateien gefunden."
  exit 0
}

$errors = @()

foreach ($path in $changedModules) {
  $currentContent = Get-Content -Raw -Path $path
  $current = Get-VersionLine -Content $currentContent -Path $path

  $oldContent = git show ("HEAD:" + $path) 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $oldContent) {
    $errors += "Konnte HEAD-Version von $path nicht lesen."
    continue
  }

  $previous = Get-VersionLine -Content ($oldContent -join "`n") -Path ("HEAD:" + $path)

  if ($current.Version -le $previous.Version) {
    $errors += "$path wurde geändert, aber die Dateiversion wurde nicht erhöht ($($previous.Raw) -> $($current.Raw))."
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
