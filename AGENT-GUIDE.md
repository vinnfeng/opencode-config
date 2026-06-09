# AGENT-GUIDE — 开渠配置库速查（AI 伙伴专用）

> 这份文件是给 AI 伙伴（Claude Code 等）看的，帮助你快速理解开渠的结构、脚本逻辑和常见操作，不用每次从头分析。

---

## 仓库结构速览

```
vinnfeng/opencode-config          ← 本仓库（配置）
├── opencode.template.jsonc       ← 模板，含占位符 PROVIDER_API_KEY / BAILIAN_API_KEY / PLUGIN_PATH
├── opencode.jsonc                ← 【gitignored】运行时生成，由脚本注入真实 key
├── opencode.jsonc.bak            ← 【gitignored】每次 generate_config 前自动备份
├── .keys                         ← 【gitignored】本机 key 存储，格式: KEY=value
├── .installed_version            ← 【gitignored】已安装的 release tag，用于版本比对
├── .previous_version             ← 【gitignored】上一个版本 tag，--rollback 时使用
├── agents/                       ← 自定义 agent 定义（orchestrator/coder/thinker/basher 等）
├── README.md                     ← 人类用安装指南
└── AGENT-GUIDE.md                ← 本文件

vinnfeng/opencode                 ← 源码仓库（fork）
└── scripts/
    ├── setup.sh / setup.ps1              ← 个人版安装脚本
    └── community-setup.sh / community-setup.ps1 ← 社区版安装脚本
```

**分支**：`main`（macOS）、`office-windows`（Windows）、`community`（对外）

---

## Key 管理机制

### 文件结构
- **`.keys`**（本机，gitignored）：`KEY=value` 格式，权限 600
- **`opencode.template.jsonc`**（git 追踪）：占位符版本，安全
- **`opencode.jsonc`**（gitignored）：由脚本从模板生成，含真实 key

### 脚本生成 opencode.jsonc 的逻辑
1. 读取 `.keys` 中的 `PROVIDER_API_KEY` 和 `BAILIAN_API_KEY`
2. 如果 `BAILIAN_API_KEY` 为空，生成时移除整个 bailian provider 块
3. macOS 检查 `~/.cache/opencode/packages/node_modules/oh-my-opencode` 是否存在，决定 `PLUGIN_PATH` 用 `file://` 还是 `@latest`
4. 通过环境变量传值给 `node -e`，避免 shell 注入

### Provider 映射
| 占位符 | 对应 provider | 是否必填 |
|---|---|---|
| `PROVIDER_API_KEY` | Anthropic, OpenAI, Google, Zhipu, DeepSeek, Kimi | 必填 |
| `BAILIAN_API_KEY` | bailian | 可选 |
| `PLUGIN_PATH` | oh-my-opencode 载体增强插件路径 | 脚本自动检测 |

---

## 安装脚本参数（setup.sh / setup.ps1）

```
无参数        完整流程：拉配置 → 设置所有 key → 生成 jsonc → 下载二进制
--keys        只更新所有 key + 重新生成 jsonc（不动二进制）
--api-key=sk-  只更新 PROVIDER_API_KEY + 重新生成 jsonc
--key bailian 只更新 BAILIAN_API_KEY + 重新生成 jsonc
--binary      只更新二进制（不动 key 和配置）
--rollback    回退到上一个版本（恢复备份二进制 + opencode.jsonc.bak）
--help / -h   显示帮助信息
```

回退机制说明：
- 每次二进制更新前，旧版本复制到 `~/.cache/opencode/backups/opencode-<tag>`（macOS）或 `%LOCALAPPDATA%\opencode-bin\backups\opencode-<tag>.exe`（Windows）
- 每次 `generate_config` 前，`opencode.jsonc` 备份为 `opencode.jsonc.bak`
- `--rollback` 只能回退一步（保留最近一次的备份）

参数传递方式：`bash <(curl -fsSL URL) --keys`（curl 管道方式同样支持参数）

版本比对：读 `.installed_version` 文件，不用 `opencode --version`（其输出是 build 时间戳，不是 release tag）

---

## Agent 体系

### 自定义 agent（agents/ 目录）
| Agent | mode | 模型 | 职责 |
|---|---|---|---|
| orchestrator | `primary`（UI 可见） | Sonnet 4.6 | 主入口，分析任务，调度子 agent |
| coder | `subagent` | Sonnet 4.6 | 代码实现 |
| thinker | `subagent` | Opus 4.6 | 深度推理，无工具，用 `<think>` 标签 |
| basher | `subagent` | Haiku 4.5 | Shell 命令执行 |
| reviewer | `subagent` | Sonnet 4.6 | 代码审查 |
| researcher | `subagent` | Sonnet 4.6 | 信息检索 |

`mode: primary` 在 UI agent 选择中可见；`mode: subagent` 仅能由 orchestrator 召唤，用户看不到。

### oh-my-openagent 内置 agent
通过 plugin 加载，在 UI 中与 orchestrator 并列显示：
- **Sisyphus**：极限模式，Best-of-N 多路并行
- **Prometheus**：火力全开

---

## 常见操作

### 修改 key 后 opencode 里模型不可用
脚本改 key 后会立即重新生成 `opencode.jsonc`，重启 opencode 即可。不需要手动编辑任何文件。

### 模板新增 provider
1. 编辑 `opencode.template.jsonc`，在对应位置加 provider 块，key 用占位符
2. 如果是新 placeholder（非 PROVIDER/BAILIAN），在脚本的 `prompt_key` 调用处加对应提示和 `generate_config` 中的替换
3. 提交模板到 git，key 绝对不能进 git

### 添加新自定义 agent
在 `agents/` 目录新建 `.md` 文件，frontmatter 格式：
```markdown
---
name: agent-name
description: 说明
model: Mify-Anthropic/ppio/pa/claude-sonnet-4-6
mode: subagent   # 或 primary
tools: []        # 工具列表
---
```

### 更新 release 版本
1. 同时修改 `scripts/setup.sh` **和** `scripts/setup.ps1` 里的 `RELEASE_TAG`（两个文件都要改，漏一个会导致 Windows 或 macOS/Linux 用户跑旧版）
2. 确保 GitHub Release 里对应 tag 有所有 6 个平台的二进制：
   - `opencode-darwin-arm64`、`opencode-darwin-x64`
   - `opencode-linux-x64`、`opencode-linux-arm64`
   - `opencode-windows-x64.exe`、`opencode-windows-arm64.exe`

---

## 关键约束（操作前必读）

- `opencode.jsonc` 和 `.keys` **永远不能进 git**，已在 `.gitignore` 中
- `opencode.template.jsonc` 里**只能放占位符**，不能放真实 key
- 修改配置文件前告知冯总确认
- 脚本向 node 传值必须通过环境变量，不能字符串插值（防止含特殊字符的 key 破坏脚本）
