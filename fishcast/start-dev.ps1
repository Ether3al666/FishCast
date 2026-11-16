# 只启动本地开发，不发布。优先使用 npm；精简环境直接调用已安装的 Vite。
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$installedNpm = Get-Command npm -ErrorAction SilentlyContinue
if ($installedNpm) {
    & $installedNpm.Source run dev
    exit $LASTEXITCODE
}
$localViteCli = Join-Path $PSScriptRoot 'node_modules/vite/bin/vite.js'
if (Test-Path -LiteralPath $localViteCli) {
    & node $localViteCli --host 127.0.0.1
    exit $LASTEXITCODE
}
Write-Error '未找到 npm。请先安装含 npm 的 Node.js 22.12+，执行 npm ci 后再启动。'
