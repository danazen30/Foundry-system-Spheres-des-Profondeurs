# Build a Foundry-ready sdp release zip locally.
# Usage (from repo root): .\scripts\build-release.ps1
# Foundry must be closed before zipping if compendium packs were open.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$manifestPath = Join-Path $repoRoot "system.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$archiveName = "sdp-$version.zip"
$stagingRoot = Join-Path $repoRoot "release-staging"
$stagingSystem = Join-Path $stagingRoot "sdp"
$archivePath = Join-Path $repoRoot $archiveName

$excludeDirs = @(".git", ".github", ".cursor", "scripts", "release-staging")
$excludeFiles = @("*.zip")

if (Test-Path $stagingRoot) {
    Remove-Item $stagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $stagingSystem -Force | Out-Null

Get-ChildItem -Path $repoRoot -Force | ForEach-Object {
    if ($excludeDirs -contains $_.Name) { return }
    if ($_.Extension -eq ".zip") { return }
    Copy-Item -Path $_.FullName -Destination (Join-Path $stagingSystem $_.Name) -Recurse -Force
}

if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
}

Compress-Archive -Path $stagingSystem -DestinationPath $archivePath -Force
Remove-Item $stagingRoot -Recurse -Force

Write-Host "Created $archivePath"
Write-Host "Attach this zip and system.json to GitHub release $version"
