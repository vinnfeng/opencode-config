# bootstrap.ps1 — OpenCode 一键安装 / 更新（Windows）
# 用法：irm https://raw.githubusercontent.com/vinnfeng/opencode-config/community/scripts/bootstrap.ps1 | iex
$ErrorActionPreference = 'Stop'

$Branch  = if ($env:OPENCODE_BRANCH) { $env:OPENCODE_BRANCH } else { 'community' }
$CfgDir  = Join-Path $env:APPDATA 'opencode'
$Repo    = 'https://github.com/vinnfeng/opencode-config'

Write-Host ''
Write-Host ('OpenCode bootstrap  分支: ' + $Branch) -ForegroundColor Cyan
Write-Host ''

foreach ($cmd in @('git', 'node')) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host ('需要先安装 ' + $cmd) -ForegroundColor Red
    Write-Host '   git: https://git-scm.com  |  node: https://nodejs.org'
    exit 1
  }
}

if (Test-Path (Join-Path $CfgDir '.git')) {
  Write-Host '配置库已存在，拉取最新...' -ForegroundColor Yellow
  git -C $CfgDir remote set-url origin $Repo 2>$null
  git -C $CfgDir fetch --all --quiet
} else {
  Write-Host '克隆配置库...' -ForegroundColor Yellow
  git clone -b $Branch $Repo $CfgDir
}

node (Join-Path $CfgDir 'scripts' 'deploy.mjs') @args
