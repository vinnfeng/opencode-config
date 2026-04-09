# OpenCode 定制版 — 长会话稳定版

> 基于 [opencode](https://github.com/sst/opencode) fork，参考 Codebuff 上下文管理思路，专注长会话稳定性。  
> 接入 Mify 多模型 + 多层 agent 调度体系。

---

## 为什么值得装

OpenCode 官方版在长任务中容易上下文爆炸（context overflow），一爆就要从头来。  
Codebuff 在长任务上更稳定，核心原因是**激进的上下文管理**——宁可早点剪枝，也不让窗口撑爆。

这个定制版把这个思路带到 OpenCode：

| 改动点 | 官方版 | 定制版 | 效果 |
|--------|--------|--------|------|
| 压缩起始阈值（PRUNE_MINIMUM）| 20K token | **10K** | 更早开始压缩 |
| 保护区大小（PRUNE_PROTECT）| 40K token | **20K** | 压缩更彻底 |
| 提前触发量（COMPACTION_BUFFER）| 20K | **30K** | 比官方提前 ~20% 触发压缩 |
| 工具输出截断（MAX_LINES）| 2000 行 | **1000 行** | 单次工具调用 token 减半 |
| 工具输出截断（MAX_BYTES）| 50 KB | **25 KB** | 完整输出仍写磁盘，不丢信息 |

**其他改动：**
- 🔧 插件启动崩溃修复：oh-my-opencode 加载慢时触发竞态白屏，已修复
- 🌏 国内网络适配：IPv6 归一化 + Header 检查移除（官方版在部分国内环境有问题）
- 🤖 多模型路由：通过 Mify 一个 key 接入 Claude / GPT / Gemini / DeepSeek / Kimi 等
- 🧠 多层 agent 体系：orchestrator 自动拆解任务，按需调度专用子 agent

---

## 5 分钟安装

**前置条件：** [Node.js 18+](https://nodejs.org)、[Git](https://git-scm.com)、Mify API Key 和 Base URL（通过内部渠道获取）

### Windows（PowerShell）

```powershell
# 1. 拉取配置库
git clone -b community https://github.com/vinnfeng/opencode-config.git "$env:APPDATA\opencode"

# 2. 一键安装：下载定制版二进制 + 部署配置
#    sk-xxx      → 替换为你的 Mify API Key
#    http://...  → 替换为 Mify Base URL（从内部渠道获取）
node "$env:APPDATA\opencode\scripts\deploy.mjs" --full --key-mify=sk-xxx --mify-url=http://...

# 3. 加 PATH（首次安装，之后不需要）
[Environment]::SetEnvironmentVariable("PATH", "$env:LOCALAPPDATA\opencode-bin;" + [Environment]::GetEnvironmentVariable("PATH","User"), "User")
# ↑ 重开一个 PowerShell 窗口后生效
```

### macOS / Linux

```bash
# 1. 拉取配置库
git clone -b community https://github.com/vinnfeng/opencode-config.git ~/.config/opencode

# 2. 一键安装（替换 sk-xxx 和 http://... 为实际值）
node ~/.config/opencode/scripts/deploy.mjs --full --key-mify=sk-xxx --mify-url=http://...
```

安装完成后：`opencode --version` 确认版本，`opencode` 启动。

---

## 更新

```bash
# 在配置库目录下执行
cd ~/AppData/Roaming/opencode   # Windows
# cd ~/.config/opencode         # macOS/Linux

node scripts/deploy.mjs --check     # 查看是否有新版本
node scripts/deploy.mjs             # 只更新配置（agent / 模型路由）
node scripts/deploy.mjs --binary    # 只更新二进制
node scripts/deploy.mjs --full      # 全量更新（配置 + 二进制）
```

---

## 模型说明

通过 Mify 内网代理，**一个 key** 接入所有模型：

| Provider | 代表模型 |
|----------|---------|
| Mify-Anthropic | Claude Opus 4.6 · Sonnet 4.6 · Haiku 4.5 |
| Mify-OpenAI | GPT-5.4 Pro · GPT-5.4 |
| Mify-Google | Gemini 3.1 Pro · Flash |
| Mify-Zhipu | GLM-5 |
| Mify-DeepSeek | DeepSeek-V5 · R2 |
| Mify-Kimi | Kimi-K2 · K2-Thinking |

模型路由由 `oh-my-openagent.json` 控制，不同 agent 自动选最适合的模型。

---

## Agent 说明

| Agent | 入口 | 说明 |
|-------|------|------|
| **orchestrator** | UI 直接可选 | 主入口，自动判断复杂度，决定是否拆子 agent |
| Sisyphus | 插件内置 | 极限模式，Best-of-N 多路并行 |
| Prometheus | 插件内置 | 火力全开模式 |
| coder / thinker / basher 等 | 由 orchestrator 调度 | 子 agent，UI 不可见 |

**日常使用：直接和 orchestrator 对话，它自己决定调谁。**

---

## 常见问题

**Q: 启动很慢（10-30s 卡住）**  
插件首次安装，等一次就好。之后正常。

**Q: 每次启动有 ~4s 延迟**  
运行 `node scripts/deploy.mjs` 会自动修复（Step 7 同步 lockfile）。

**Q: Windows 找不到 opencode 命令**  
Step 3 的 PATH 设置执行完后，重开一个 PowerShell 窗口。

**Q: 下载二进制失败 / 很慢**  
挂代理后重试，或手动从 [Releases](https://github.com/vinnfeng/opencode/releases) 下载对应平台版本放到 `~\AppData\Local\opencode-bin\`。

**Q: key 写错了怎么改**  
```bash
node scripts/deploy.mjs --key-mify=新的key
```

---

## 详细文档

- 部署脚本完整说明：[docs/upgrade-sop.md](docs/upgrade-sop.md)
- Agent 使用指南：[AGENT-GUIDE.md](AGENT-GUIDE.md)

---

*Maintained by vinnfeng — community branch 无百炼依赖，仅需 Mify key*
