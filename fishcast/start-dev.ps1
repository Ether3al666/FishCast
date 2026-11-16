# Local development only. No publishing or machine-wide policy changes.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$installedNpm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($installedNpm) {
    & $installedNpm.Source run dev
    exit $LASTEXITCODE
}
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExe = if ($nodeCommand) { $nodeCommand.Source } else { $null }
if (-not $nodeExe) {
    $runtimePackage = Get-AppxPackage -Name 'OpenAI.CodexPrimaryRuntime*' | Sort-Object Version -Descending | Select-Object -First 1
    if ($runtimePackage) {
        $runtimeNode = Join-Path $runtimePackage.InstallLocation 'dependencies\node\bin\node.exe'
        if (Test-Path -LiteralPath $runtimeNode) { $nodeExe = $runtimeNode }
    }
}
$localViteCli = Join-Path $PSScriptRoot 'node_modules/vite/bin/vite.js'
if ($nodeExe -and (Test-Path -LiteralPath $localViteCli)) {
    & $nodeExe $localViteCli --host 127.0.0.1
    exit $LASTEXITCODE
}
Write-Error 'Node.js or project dependencies are missing. Install Node.js 22.12+ and run npm ci first.'
