# 开渠 OpenCode 配置库

基于 [opencode-ai](https://github.com/sst/opencode) 的增强配置，一个 Key 接入全模型 + 优化 agent 体系。

---

## 选哪个版本？

| | 个人版 | 社区版 |
|---|---|---|
| 二进制 | 我们自己编译的（含优化）| 官方 npm 版 |
| 适用人群 | 内部人员 | 同事 / 团队分享 |
| 需要的 key | API Key（必填）+ 百炼（可选）| 仅 API Key |
| 安装方式 | 下方个人版命令 | 下方社区版命令 |

---

## 前置条件

运行安装脚本前，确保已安装：

| 工具 | macOS | Linux | Windows |
|---|---|---|---|
| git | `xcode-select --install` | `apt install git` | [git-scm.com](https://git-scm.com/download/win) |
| node | [nodejs.org](https://nodejs.org) 或 `brew install node` | `apt install nodejs` | [nodejs.org](https://nodejs.org) |
| curl | 系统自带 | `apt install curl` | 系统自带（Win10+）|
| npm | 随 node 一起安装 | 随 node 一起安装 | 随 node 一起安装 |

> npm 仅社区版需要。

---

## 个人版安装（仅限内部人员）

**macOS / Linux**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/vinnfeng/opencode/fengzhen/performance-tuning/scripts/setup.sh)
```

**Windows（管理员 PowerShell）**
```powershell
irm https://raw.githubusercontent.com/vinnfeng/opencode/fengzhen/performance-tuning/scripts/setup.ps1 | iex
```

安装过程：
1. 拉取配置文件（自动）
2. 提示输入 API Key（见下方说明）
3. 下载并安装定制版 opencode 二进制

---

## 社区版安装（分享给同事 / 团队）

**macOS / Linux**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/vinnfeng/opencode/fengzhen/performance-tuning/scripts/community-setup.sh)
```

**Windows（PowerShell）**
```powershell
irm https://raw.githubusercontent.com/vinnfeng/opencode/fengzhen/performance-tuning/scripts/community-setup.ps1 | iex
```

---

## API Key 说明

首次安装时脚本会逐个提示：

| Key | 是否必填 | 获取地址 |
|---|---|---|
| API Key | **必填** | 从服务商后台获取 |
| 百炼 API Key | 可选（直接回车跳过）| 阿里云百炼平台 |

- Key 仅保存在本机 `~/.config/opencode/.keys`，权限 600，**不会上传 git**
- 更新时自动读取上次的值，直接回车保留，输入新值则替换

---

## 更新 / 管理 Key

重新运行安装命令即可全量更新。如果只想单独操作：

```bash
# 只更新所有 key（不重新下载二进制）
bash <(curl -fsSL https://...setup.sh) --keys

# 只换 API Key
bash <(curl -fsSL https://...setup.sh) --api-key

# 只换百炼 key
bash <(curl -fsSL https://...setup.sh) --key bailian

# 只更新二进制（不动 key）
bash <(curl -fsSL https://...setup.sh) --binary

# 查看帮助
bash <(curl -fsSL https://...setup.sh) --help
```

> 将 `...setup.sh` 替换为完整 URL，Windows 用 `setup.ps1` + `irm ... | iex` 方式。
>
> 或者 `git clone` 下 source repo 后直接 `./scripts/setup.sh --keys` 也可以。

---

## 模型说明

| Provider | 平台 | 主要模型 | Key |
|---|---|---|---|
| Anthropic | Provider API | Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5 | PROVIDER_API_KEY |
| OpenAI | Provider API | GPT-5.4 Pro / GPT-5.4 | PROVIDER_API_KEY |
| Google | Provider API | Gemini 3.1 Pro / Flash | PROVIDER_API_KEY |
| Zhipu | Provider API | GLM-5 | PROVIDER_API_KEY |
| bailian | 阿里云百炼 | Qwen3.5-plus | BAILIAN_API_KEY（可选）|

> 以上 provider **共用一个 key**。

---

## Agent 说明

| Agent | 入口 | 说明 |
|---|---|---|
| **orchestrator** | UI 中直接可选 | 主编排，自动判断复杂度，决定是否拆分子 agent |
| Sisyphus | 插件内置 | 极限模式，Best-of-N 多路并行 |
| Prometheus | 插件内置 | 火力全开模式 |
| coder / thinker / basher 等 | 由 orchestrator 调度 | UI 中不可见，仅被 orchestrator 召唤 |

**平时直接和 orchestrator 对话即可。**

---

## 分支说明

| 分支 | 用途 |
|---|---|
| `main` | 个人版 macOS |
| `office-windows` | 个人版 Windows |
| `community` | 社区版（无 bailian）|

---

## 常见问题

**Q: 脚本提示 `git: command not found` / `node: command not found`**
见上方前置条件，安装对应工具后重试。

**Q: 下载二进制很慢或失败**
挂代理后重试，或单独运行 `--binary` 参数。

**Q: key 改完了但模型还是不可用**
脚本改完 key 会自动重新生成 `opencode.jsonc`。重启 opencode 生效。

**Q: 想重置配置**
```bash
rm ~/.config/opencode/opencode.jsonc
# 然后重新运行安装命令
```

**Q: Windows 报"无法加载文件，因为在此系统上禁止运行脚本"**
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## AI 伙伴速查 → [AGENT-GUIDE.md](AGENT-GUIDE.md)
