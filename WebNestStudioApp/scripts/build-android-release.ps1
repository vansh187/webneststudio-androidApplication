$ErrorActionPreference = 'Stop'

$appRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')
$releaseRoot = 'D:\wna'
$releaseAndroid = Join-Path $releaseRoot 'android'
$bundleName = 'app-release.aab'
$releaseBundle = Join-Path $releaseAndroid "app\build\outputs\bundle\release\$bundleName"
$localBundleDir = Join-Path $appRoot 'android\app\build\outputs\bundle\release'
$localBundle = Join-Path $localBundleDir $bundleName

if (!(Test-Path -LiteralPath $releaseRoot)) {
  New-Item -ItemType Directory -Path $releaseRoot | Out-Null
}

robocopy $appRoot $releaseRoot /E /XD .git android\app\build android\build android\.gradle android\.kotlin /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -gt 7) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

if (!(Test-Path -LiteralPath 'D:\tmp')) {
  New-Item -ItemType Directory -Path 'D:\tmp' | Out-Null
}

$env:TMP = 'D:\tmp'
$env:TEMP = 'D:\tmp'
$env:NODE_OPTIONS = '--max-old-space-size=4096'
$env:CMAKE_BUILD_PARALLEL_LEVEL = '1'

Push-Location $releaseAndroid
try {
  & .\gradlew.bat --stop
  & .\gradlew.bat --no-daemon bundleRelease
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force -Path $localBundleDir | Out-Null
Copy-Item -LiteralPath $releaseBundle -Destination $localBundle -Force
Write-Output "Built $localBundle"
