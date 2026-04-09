# Agent 重复问题排查与修复记录

**日期**: 2026-04-10  
**修复人**: 曜构  
**影响**: 开渠（OpenCode）TUI agent 列表出现重复项

---

## 问题现象

TUI 按 tab 显示 10 个 agent，其中 4 个是重复的：
- `Sisyphus (Ultraworker)` + `Sisyphus-Ultraworker`
- `Hephaestus (Deep Agent)` + `Hephaestus - Deep Agent`
- `Prometheus (Plan Builder)` + `Prometheus - Plan Builder`
- `Atlas (Plan Executor)` + `Atlas - Plan Executor`
- 还有一个多余的 `orchestrator`

## 根因分析

### 1. 插件改名导致配置混乱

oh-my-opencode 上游维护者（code-yeongyu）将包名从 `oh-my-opencode` 改为 `oh-my-openagent`。
两个包名指向同一个插件（v3.16.0），内置了自动迁移逻辑。

但我们的配置文件散落在多处，名字不统一：
- 全局 `~/.config/opencode/opencode.jsonc` → plugin: `oh-my-openagent@latest`
- 项目级 `.opencode/opencode.jsonc` → plugin: `oh-my-opencode@latest`（会被自动迁移）
- 全局 `oh-my-openagent.json` → 有 categories
- 项目级 `oh-my-openagent.jsonc` → 有 agents + categories
- 项目级 `oh-my-opencode.json` → 有 categories（旧文件名）

### 2. 多层配置叠加

插件加载时合并了全局 + 项目级配置，agent override 被注册了多次。

### 3. 自定义 agent 文件冲突

`~/.config/opencode/agents/` 下有 7 个手写的 .md agent 文件（orchestrator, thinker, coder, architect, basher, researcher, reviewer），
通过 oh-my-openagent 的 claude-code-agent-loader 被加载，和插件内置 agent 重复。

## 修复措施

1. **删除自定义 agent .md 文件**：`~/.config/opencode/agents/*.md` 全部删除（已备份到 agents-backup-20260410/）
2. **禁用重复的项目级 oh-my-opencode.json**：改名为 `.disabled`，避免和 oh-my-openagent.jsonc 重复加载
3. **清空全局 oh-my-openagent.json**：只保留 schema，让项目级 `.opencode/oh-my-openagent.jsonc` 作为唯一权威源
4. **统一插件名**：全局和项目级都使用 `oh-my-openagent@latest`
5. **从配置库删除 agents/ 目录**：三个分支（main/office-windows/community）都已清理

## 修复后状态

TUI 显示 5 个不重复的 agent：

| Agent | 模式 | 定位 |
|-------|------|------|
| Sisyphus (Ultraworker) | primary | 主编排，分析任务并协调子 agent |
| Hephaestus (Deep Agent) | primary | 自主深度执行 |
| OpenCode-Builder | — | 官方默认 build agent |
| Prometheus (Plan Builder) | — | 规划 |
| Atlas (Plan Executor) | primary | 任务执行编排 |

## 配置权威源

**唯一权威源**：项目级 `.opencode/oh-my-openagent.jsonc`

包含：
- `agents` 段：Sisyphus/Librarian/Explore/Oracle/Build 的 Mify 模型 override + CodeBuff 哲学 prompt
- `categories` 段：按任务复杂度分配模型（quick/unspecified-low/unspecified-high/writing/git）
- `experimental` 段：dynamic context pruning 配置
- `sisyphus_agent` 段：Sisyphus 总控开关

## 经验教训

1. 不要在多个地方定义相同的配置（全局 vs 项目级 vs .md 文件）
2. 插件改名后要统一所有配置文件的引用
3. 自定义 agent 应通过插件的 override 机制，不要用独立 .md 文件绕过插件
4. 改配置前先搞清楚加载链路：哪些文件会被读、优先级是什么
