# OpenCode 升级部署 SOP

> **适用场景**：升级 opencode 二进制版本 / 同步配置库到本机  
> **维护人**：Claude Code（记录于 2026-04-09）  
> **经验来源**：一次真实的升级过程，踩坑后整理

---

## TL;DR — 一句话版本

```bash
# 在配置库目录下执行，10 分钟内完成全部升级
node scripts/deploy.mjs
```

脚本会自动：拉取最新 → 备份 → 部署文件 → 生成含 key 的 jsonc → 修复启动延迟 → 输出校验报告

---

## 场景一：只更新二进制（新版本 opencode）

1. 下载新版二进制，替换 `opencode-bin/` 目录下的文件
2. 确认版本：`opencode --version`
3. 运行脚本验证配置无变化：`node scripts/deploy.mjs --verify-only`
4. 试跑一次确认无报错：`opencode --print-logs`（看启动日志，< 2s 为正常）

**常见问题**：启动有 ~4s 延迟 → 执行 Step 7（脚本自动处理，见下）

---

## 场景二：同步配置库（含 agent / 模型路由 / 插件配置）

直接运行部署脚本：

```bash
# 完整部署（自动读取现有 key，无需重新输入）
node scripts/deploy.mjs

# 如果 key 有变化
node scripts/deploy.mjs --api-key=sk-xxx --key-bailian=sk-xxx

# 只预览，不写文件
node scripts/deploy.mjs --dry-run

# 只对比，不修改（用于人工复查）
node scripts/deploy.mjs --verify-only
```

---

## 脚本做了什么（手动流程备用）

### Step 1  前置检查
- 确认 git repo 存在且可访问
- Windows：`~/AppData/Roaming/opencode/`
- macOS/Linux：`~/.config/opencode/`（配置目录本身就是 repo）

### Step 2  拉取最新
```bash
git -C <REPO_DIR> fetch --all
```
使用的分支：Windows → `office-windows`，macOS/Linux → `main`

### Step 3  备份
```bash
cp -r ~/.config/opencode ~/.config/opencode.bak.<timestamp>
```
**绝对不要跳过这步**，出问题可以秒级回滚。

### Step 4  部署文件
从 git 以**二进制方式**读取并写入（保留 LF 行尾，避免 CRLF 导致比对误判）：
- `agents/` 目录全部 7 个 `.md` 文件
- `oh-my-openagent.json`（模型路由 + experimental 动态剪枝）
- `AGENT-GUIDE.md`、`README.md`
- `plugins/`、`skills/` 目录

**⚠️  不要覆盖的文件**：
- `opencode.json` — 机器特定，含 MCP 配置、默认模型、Windows 路径

### Step 5  生成 opencode.jsonc
从 `opencode.template.jsonc` 模板生成，做两处替换：

| 占位符 | 替换为 |
|--------|--------|
| `PROVIDER_API_KEY` | 真实 API Key（`sk-...`）|
| `BAILIAN_API_KEY` | 真实百炼 key（可留空）|
| `"oh-my-openagent@latest"` | `"file:///~/.cache/opencode/node_modules/oh-my-opencode"` |

> **为什么替换 plugin 路径？**  
> `@latest` 会在每次首次启动时触发完整 npm install（~100 个包，10-30s 挂起）。  
> `file://` 指向本地已安装缓存，跳过网络请求，瞬间加载。

### Step 6  修复启动 reify 延迟
每次启动 opencode 会检查 `~/.opencode/` 目录的 lockfile。  
如果 lockfile 记录的 plugin 版本与 opencode 期望版本不符，会触发 npm reify（约 4s）。

修复方法：将 `~/.config/opencode/package-lock.json` 复制到 `~/.opencode/`：
```bash
cp ~/.config/opencode/package-lock.json ~/.opencode/package-lock.json
```

### Step 7  验证
```bash
node scripts/deploy.mjs --verify-only
```
所有文件应输出 `SAME`。若有 `DIFF`，先排除 CRLF 问题（见下方排查）。

---

## 已知坑 & 排查

### 坑 1：改错了配置文件
**现象**：改了 `~/AppData/Roaming/opencode/opencode.jsonc`，opencode 没有反应  
**原因**：那是 git 备份库里的文件，opencode 实际读的是 `~/.config/opencode/opencode.jsonc`  
**检查方法**：`opencode --print-logs` 查看日志里的实际配置路径  

### 坑 2：文件比对显示 DIFF 但内容一致
**原因**：PowerShell `Copy-Item` 写入 CRLF，git 存储 LF  
**排查**：用 Node.js 比较（归一化行尾后对比），而非直接字节对比  
**脚本已处理**：`deploy.mjs` 的 `sameContent()` 函数自动归一化

### 坑 3：opencode 首次启动卡死（10-30s）
**原因**：plugin 路径用了 `oh-my-opencode@latest`，触发 npm install  
**修复**：`deploy.mjs` Step 5 自动替换为 `file://` 本地路径

### 坑 4：每次启动有 ~4s 延迟
**原因**：`~/.opencode/bun.lock` 版本与 opencode 期望的不符，触发 npm reify  
**修复**：`deploy.mjs` Step 7 自动同步 `package-lock.json`

### 坑 5：opencode 命令找不到
**原因**：新开 PowerShell 会话 PATH 未更新  
**临时修复**：
```powershell
$env:PATH = "C:\Users\Mi\AppData\Local\opencode-bin;" + $env:PATH
```
**永久修复**：注册表 User PATH 已包含该路径，重开 PowerShell 窗口即可

---

## 文件布局速查

```
~/.config/opencode/          ← opencode 实际读取的配置目录
  opencode.jsonc             ← 由模板生成（含 key，gitignore）
  opencode.json              ← 机器特定（MCP、默认模型）
  oh-my-openagent.json       ← 模型路由策略（由 oh-my-opencode 插件读取）
  agents/                    ← 自定义 agent（7 个）
  plugins/                   ← 插件扩展
  skills/                    ← skill 定义
  package-lock.json          ← 锁定插件版本（同步到 ~/.opencode/）
  AGENT-GUIDE.md             ← agent 使用指南

~/AppData/Roaming/opencode/  ← git 配置库（Windows）
~/.config/opencode/          ← git 配置库（macOS，同上）
  scripts/deploy.mjs         ← 本部署脚本
  opencode.template.jsonc    ← 模板（key 用占位符）
  docs/upgrade-sop.md        ← 本文件

~/.cache/opencode/
  node_modules/oh-my-opencode/  ← 插件缓存（file:// 指向这里）

~/.opencode/
  package-lock.json          ← 复制自配置目录，用于消除 reify 延迟
```

---

## Agent 体系速查

| Agent | 来源 | 在 UI 中可见 | 说明 |
|-------|------|------------|------|
| **orchestrator** | `agents/orchestrator.md` | ✅ | 主入口，自动判断复杂度，按需拆分子 agent |
| Sisyphus | 插件内置 | ✅ | 极限模式，Best-of-N 多路并行 |
| Prometheus | 插件内置 | ✅ | 火力全开 |
| coder / thinker / basher 等 | `agents/*.md` | ❌（由 orchestrator 调度）| 子 agent |

**平时只和 orchestrator 说话**，它会自己决定调谁。

---

## 分支对照

| 分支 | 用途 |
|------|------|
| `main` | 个人版 macOS / 家里电脑 |
| `office-windows` | 个人版 Windows / 公司电脑 |
| `community` | 社区版（无 bailian，对外分享用）|

---

*最后更新：2026-04-09 by Claude Code*
