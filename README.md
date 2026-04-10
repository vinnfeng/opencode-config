# 开渠 OpenCode 配置库

基于 [opencode-ai](https://github.com/sst/opencode) 的增强配置，一个 Key 接入全模型 + 优化 agent 体系。

---

## 前置条件

| 工具 | macOS | Linux / WSL | Windows |
|---|---|---|---|
| git | `xcode-select --install` | `apt install git` | [git-scm.com](https://git-scm.com/download/win) |
| node | [nodejs.org](https://nodejs.org) 或 `brew install node` | `apt install nodejs` | [nodejs.org](https://nodejs.org) |

---

## 个人版安装（内部人员）

**macOS / Linux / WSL — 一条命令**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/vinnfeng/opencode-config/main/scripts/bootstrap.sh) --full
```

**Windows（PowerShell）— 一条命令**
```powershell
irm https://raw.githubusercontent.com/vinnfeng/opencode-config/office-windows/scripts/bootstrap.ps1 | iex
```

自动完成：克隆配置库 → 检测/输入 Key → 下载二进制 → 设置 PATH。重开终端输入 `opencode` 即可。

<details>
<summary>手动安装（不想 curl | iex 的）</summary>

```bash
# macOS / Linux / WSL
git clone -b main https://github.com/vinnfeng/opencode-config ~/.config/opencode
node ~/.config/opencode/scripts/deploy.mjs --full
```
```powershell
# Windows
git clone -b office-windows https://github.com/vinnfeng/opencode-config "$env:APPDATAopencode"
node "$env:APPDATAopencodescriptsdeploy.mjs" --full
```
</details>

---

## 社区版安装（分享给同事）

**macOS / Linux / WSL**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/vinnfeng/opencode-config/community/scripts/bootstrap.sh) --full
```

**Windows**
```powershell
irm https://raw.githubusercontent.com/vinnfeng/opencode-config/community/scripts/bootstrap.ps1 | iex
```

---

## 更新 / 管理 Key

```bash
cd ~/.config/opencode          # macOS/Linux/WSL
# cd "$env:APPDATAopencode"   # Windows

node scripts/deploy.mjs                      # 只更新配置
node scripts/deploy.mjs --full               # 配置 + 二进制
node scripts/deploy.mjs --api-key=sk-xxx     # 替换 API Key
node scripts/deploy.mjs --key-bailian=sk-xxx # 替换百炼 key
node scripts/deploy.mjs --check              # 查看版本，不改任何东西
```

---

## 模型说明

| Provider | 主要模型 | Key |
|---|---|---|
| Anthropic | Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5 | PROVIDER_API_KEY |
| OpenAI | GPT-5.4 Pro / GPT-5.4 / O3 / O4 Mini | PROVIDER_API_KEY |
| Google | Gemini 3.1 Pro / Flash | PROVIDER_API_KEY |
| Zhipu | GLM-5 | PROVIDER_API_KEY |
| DeepSeek | DeepSeek V3.2 / R1 | PROVIDER_API_KEY |
| Kimi | Kimi K2.5 | PROVIDER_API_KEY |
| bailian | Qwen3.5-plus | BAILIAN_API_KEY（可选）|

> 以上 provider **共用一个 key**。

---

## Agent 说明

直接和 **orchestrator** 说话就行，它自动判断复杂度，按需拆子任务调专用 agent，不用记 agent 名字。

| Agent | 可见性 | 说明 |
|---|---|---|
| **orchestrator** | UI 可选 | 主入口，自动编排 |
| Sisyphus | UI 可选 | 极限模式，多路并行 |
| Prometheus | UI 可选 | 火力全开 |
| coder / thinker / basher 等 | 不可见 | 由 orchestrator 召唤 |

---

## 分支说明

| 分支 | 用途 |
|---|---|
| `main` | 个人版 macOS / Linux / WSL |
| `office-windows` | 个人版 Windows |
| `community` | 社区版（分享给同事）|

---

## 常见问题

**Q: opencode 命令找不到**  
重开一个终端。还不行就重跑一次 bootstrap 命令。

**Q: 首次启动卡 10-30 秒**  
插件第一次安装，等一次，以后正常。

**Q: 下载二进制失败**  
挂代理重试，或 `node scripts/deploy.mjs`（不带 --full）先装配置，二进制手动放入 `~/.local/bin/`。

**Q: 想重置配置**
```bash
rm ~/.config/opencode/opencode.jsonc   # macOS/Linux/WSL
node scripts/deploy.mjs                # 重新生成
```

---

## AI 伙伴速查 → [AGENT-GUIDE.md](AGENT-GUIDE.md)
