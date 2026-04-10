#!/usr/bin/env bash
# bootstrap.sh — OpenCode 一键安装 / 更新
# 用法：bash <(curl -fsSL https://raw.githubusercontent.com/vinnfeng/opencode-config/main/scripts/bootstrap.sh)
set -euo pipefail

BRANCH="${OPENCODE_BRANCH:-main}"
CFG_DIR="$HOME/.config/opencode"
REPO="https://github.com/vinnfeng/opencode-config"

echo ""
echo "🚀 OpenCode 配置库 bootstrap（分支: $BRANCH）"
echo ""

# 检查前置依赖
for cmd in git node; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ 需要先安装 $cmd"
    echo "   git: https://git-scm.com  |  node: https://nodejs.org"
    exit 1
  fi
done

# 首次克隆 / 已有则更新 remote
if [ -d "$CFG_DIR/.git" ]; then
  echo "📦 配置库已存在，拉取最新..."
  git -C "$CFG_DIR" remote set-url origin "$REPO" 2>/dev/null || true
  git -C "$CFG_DIR" fetch --all --quiet
else
  echo "📦 克隆配置库..."
  git clone -b "$BRANCH" "$REPO" "$CFG_DIR"
fi

# 执行部署（透传所有参数）
exec node "$CFG_DIR/scripts/deploy.mjs" "$@"
