# OpenCode 定制版

> Claude · GPT · Gemini · DeepSeek · Kimi，一个 Key 全用上。  
> 顺手修了官方版长任务必崩的问题。

---

## 装好只要两条命令

**前置：** [Node.js 18+](https://nodejs.org) · [Git](https://git-scm.com) · API Key（从你的 AI 服务商获取）

**Windows（PowerShell）**

```powershell
git clone -b community https://github.com/vinnfeng/opencode-config.git "$env:APPDATA\opencode"
node "$env:APPDATA\opencode\scripts\deploy.mjs" --full
```

**macOS / Linux**

```bash
git clone -b community https://github.com/vinnfeng/opencode-config.git ~/.config/opencode
node ~/.config/opencode/scripts/deploy.mjs --full
```

脚本会自动检测已有配置；检测不到会提示你填，填一次以后不再问。

装完：**重开一个终端** → 输入 `opencode` → 开搞。

> **Windows 首次安装**还需要加一行 PATH（加一次，永久生效）：
> ```powershell
> [Environment]::SetEnvironmentVariable("PATH", "$env:LOCALAPPDATA\opencode-bin;" + [Environment]::GetEnvironmentVariable("PATH","User"), "User")
> ```
> 重开终端后生效。

---

## 更新

```bash
# Windows
cd "$env:APPDATA\opencode"; node scripts/deploy.mjs --full

# macOS / Linux
cd ~/.config/opencode && node scripts/deploy.mjs --full
```

---

## 遇到问题

**opencode 命令找不到（Windows）**  
→ PATH 那行跑了没？跑完重开一个 PowerShell。

**首次启动卡 10-30 秒**  
→ 插件第一次安装，等一次就好，以后正常。

**下载二进制失败**  
→ 挂代理重试；或从 [Releases](https://github.com/vinnfeng/opencode/releases) 手动下载，放到 `AppData\Local\opencode-bin\`。

**Key 填错了 / 想换 Key**  
```bash
# Windows
cd "$env:APPDATA\opencode"; node scripts/deploy.mjs --api-key=你的新key

# macOS / Linux
cd ~/.config/opencode && node scripts/deploy.mjs --api-key=你的新key
```

---

<details>
<summary>💡 这东西改了什么？点开看</summary>

## 为什么官方版越用越慢

OpenCode 跑长任务会越来越慢，跑到一半 AI 开始"忘"你最初说的需求，甚至崩掉。  
根本原因是上下文窗口管理太保守——等快满了才开始压缩，已经晚了。

参考 Codebuff 的思路，改了 5 个参数：

| 参数 | 官方版 | 定制版 | 效果 |
|------|--------|--------|------|
| 压缩触发阈值 | 20K token | **10K** | 更早开始压缩 |
| 保护区大小 | 40K token | **20K** | 压缩更彻底 |
| 提前触发量 | 20K buffer | **30K** | 比官方提前约 20% 触发 |
| 工具输出上限 | 2000 行 / 50 KB | **1000 行 / 25 KB** | 单次占用减半 |

截断的工具输出不丢失——完整内容仍写磁盘，AI 需要时可继续读取。

**另外顺手修了：**
- 🔧 插件加载竞态 bug（官方版偶发白屏）
- 🌏 国内网络问题（IPv6 归一化 + Header 检查）
- 🤖 统一路由：一个 Key 路由 Claude / GPT / Gemini / DeepSeek / Kimi

## Agent 体系

直接和 **orchestrator** 说话就行，它自动判断复杂度，决定是否拆子任务、调哪个专用 agent。  
不用记 agent 名字，描述需求就行。

## 支持模型

一个 Key 接入：

- Anthropic：Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5
- OpenAI：GPT-5.4 Pro / GPT-5.4 / O3 / O4 Mini
- Google：Gemini 3.1 Pro / Flash
- Zhipu：GLM-5
- DeepSeek：DeepSeek V3.2 / R1
- Kimi：Kimi K2.5

</details>

---

*Community branch — 仅需 API Key，无其他依赖*
