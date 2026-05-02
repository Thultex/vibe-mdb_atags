$ErrorActionPreference = "Stop"

$moduleFiles = @(
  "core/collectAtags.js",
  "core/exportAtags.js",
  "core/helpers.js",
  "core/restoreAtags.js",
  "addons/1_tagging/tagCleaner.js",
  "addons/1_tagging/tagPairParser.js",
  "addons/2_syncing/globalFieldSync.js",
  "addons/2_syncing/syncLastFromLatest.js",
  "addons/3_workflow/floatingAverage.js",
  "addons/3_workflow/sequenceCounter.js",
  "addons/3_workflow/timeMarker.js",
  "addons/6_integration/obsidianLinker.js",
  "addons/6_integration/wikiLinker.js",
  "addons/z_generell/multiChoiceHelpers.js",
  "addons/z_generell/typedTextFields.js",
  "addons/z_others/hourGuide.js"
)

function Get-VersionLine {
  param(
    [string]$Content,
    [string]$Path
  )

  $match = [regex]::Match($Content, '(?m)^([ABC]\d+) [^\r\n]* v(\d+\.\d+) \(sys (\d+\.\d+)\)$')
  if (-not $match.Success) {
    throw "Keine Versionszeile im erwarteten Format gefunden: $Path (erwartet z.B. A1 collectAtags v1.37 (sys 2.20))"
  }

  return [pscustomobject]@{
    Raw = $match.Value
    ModuleId = $match.Groups[1].Value
    Version = [version]($match.Groups[2].Value)
    SysVersion = [version]($match.Groups[3].Value)
  }
}

function Get-ExpectedModuleId {
  param([string]$Path)

  $index = [array]::IndexOf($moduleFiles, $Path)
  if ($index -lt 0) {
    return $null
  }

  if ($Path -like "core/*") {
    return "A" + ($index + 1)
  }

  if ($Path -like "addons/z_generell/*" -or $Path -like "addons/z_others/*") {
    return "C" + ($index - 12)
  }

  return "B" + ($index - 3)
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
  $expectedModuleId = Get-ExpectedModuleId -Path $path

  if ($expectedModuleId -and $current.ModuleId -ne $expectedModuleId) {
    $errors += "$path hat Kennung $($current.ModuleId), erwartet ist $expectedModuleId."
  }

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
