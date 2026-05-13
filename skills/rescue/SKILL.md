# OpenClaw 救援专家 (openclaw-rescue-expert)

**版本**: v3.1.2  
**创建时间**: 2026-03-29  
**作者**: 老二（明微）  
**适用范围**: 单主机多 Gateway 实例救援（老大/老二/老三）

---

## 🎯 用途

当 OpenClaw 多实例环境中某个分身出现以下问题时使用：

- Gateway 无响应/端口不监听
- Discord/飞书频道掉线
- LaunchAgent 失管/配置串线
- Session 入口索引异常
- 代理配置导致通信失败
- LaunchAgent 被禁用（disabled 状态）

**核心价值**：固化 2026-03-28/29 夜间多实例救援经验，降低串线、误救、自救、索引误判和代理误伤风险。

---

## 📦 包含内容

```
openclaw-rescue-expert/
├── SKILL.md                          # 本文件（技能说明）
├── runbooks/
│   ├── rescue-guide-v3.1.md          # 救援指南 v3.1（整合方法论）
│   └── preflight-checklist.md        # 修复前检查清单（10 项）
├── tools/
│   ├── rescue-agent-v3.1.1.sh        # 多实例救援脚本 v3.1.1
│   └── verify-agent-health.sh        # 健康验证脚本
└── hooks/
    └── rescue-hook.yaml              # 自动触发钩子
```

---

## 🚀 安装方式

### 方式 1：直接解压到共享空间（推荐）

```bash
# 解压到共享空间
unzip openclaw-rescue-expert-v3.1.1.zip -d ~/openclaw-shared/skill-pack/01-Process/

# 赋予执行权限
chmod +x ~/openclaw-shared/skill-pack/01-Process/openclaw-rescue-expert/tools/*.sh

# 创建软链接到 rescue 目录
ln -sf ~/openclaw-shared/skill-pack/01-Process/openclaw-rescue-expert/tools/rescue-agent-v3.1.1.sh ~/openclaw-shared/tools/rescue/rescue-agent.sh
```

### 方式 2：使用 ClawHub（待发布）

```bash
clawhub install openclaw-rescue-expert
```

---

## 🎯 触发机制

### 手动触发

```bash
# 救援指定实例
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-1

# 检查实例状态
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-2 status

# 重启实例
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-3 restart

# 停止实例
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-1 stop
```

### 自动触发（通过钩子）

当满足以下条件时自动触发救援流程：

- Gateway 端口不可访问（健康检查失败）
- LaunchAgent 状态异常（`launchctl print` 返回错误）
- Discord/飞书频道掉线（日志中出现 `disconnected` 或 `fetch failed`）
- LaunchAgent 被禁用（`launchctl print-disabled` 显示 disabled）

钩子配置示例 (`rescue-hook.yaml`)：

```yaml
name: openclaw-rescue-trigger
description: 自动检测 Gateway 故障并触发救援流程
triggers:
  - type: health_check
    condition: gateway.port.unreachable
    action: notify_and_prepare_rescue
  - type: log_pattern
    pattern: "(disconnected|fetch failed|The plain HTTP request was sent to HTTPS port)"
    action: analyze_and_suggest
  - type: launchd_check
    condition: launchctl.disabled == true
    action: enable_and_restart
```

---

## 📋 核心功能

### 1. 多实例隔离保护

- 显式设置 `OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_STATE_DIR`
- 独立 LaunchAgent 标签（`ai.openclaw.gateway.cloneX`）
- 独立日志文件（`/tmp/gateway-clone-X.log`）
- 自动验证 Discord 频道确认配置正确

### 2. 标准排障顺序

```
1. 确认真故障（端口监听/日志/健康探针）
2. 确认活跃状态树（配置路径/状态目录/端口）
3. 确认正式托管链路（LaunchAgent/plist/环境变量）
4. 再看 Session（入口索引/.jsonl 文件）
5. 最后才看代理（NO_PROXY/网络配置）
```

### 3. 三层修复流程

| 层级 | 适用场景 | 修复方式 |
|------|---------|---------|
| **服务层** | 端口未监听/LaunchAgent 未加载/被禁用 | 重挂 LaunchAgent + 正式托管链路 + enable |
| **索引层** | 关键 session 入口消失 | 恢复 `agent:main:main` + Discord 绑定入口 |
| **通信层** | 服务正常但 Discord/飞书失败 | 修复代理配置（NO_PROXY/no_proxy） |

### 4. 修复前检查清单（10 项）

- [ ] 确认目标分身是谁
- [ ] 确认当前不是在自救
- [ ] 确认活跃状态树
- [ ] 确认正式 LaunchAgent 标签
- [ ] 确认 `OPENCLAW_CONFIG_PATH`
- [ ] 确认 `OPENCLAW_STATE_DIR`
- [ ] 确认日志路径
- [ ] 确认是服务/索引/代理中的哪一类问题
- [ ] 已完成备份
- [ ] 准备使用正式救援链路而不是裸命令

### 5. LaunchAgent 配置验证（v3.1.1 新增）

- 验证 `Label` 是否正确
- 验证 `EnvironmentVariables.OPENCLAW_CONFIG_PATH` 是否正确
- 验证 `EnvironmentVariables.OPENCLAW_STATE_DIR` 是否正确
- 验证 `EnvironmentVariables.OPENCLAW_LAUNCHD_LABEL` 是否正确

### 6. launchd disabled 状态检测与恢复（v3.1.1 新增）

- 自动检测 LaunchAgent 是否被禁用
- 自动执行 `launchctl enable` 恢复
- 验证恢复后状态

---

## 🔧 可用实例

| 实例 | 配置路径 | 状态目录 | 端口 | Discord 频道 |
|------|---------|---------|------|-------------|
| **老大** (clone-1) | `~/.openclaw/openclaw.json` | `~/.openclaw/` | 18789 | 1474330612239171635 |
| **老二** (clone-2) | `~/openclaw-clone-2/openclaw.json` | `~/openclaw-clone-2/` | 19789 | 1477387046376177746 |
| **老三** (clone-3) | `~/openclaw-clone-3/openclaw.json` | `~/openclaw-clone-3/` | 19790 | 1477387158389133465 |

**注意**: QClaw 不支持（Electron 应用态，需专用救援模式）

---

## ⚠️ 硬规则（必读）

### 1. 绝不裸修

**禁止**默认使用：
- `openclaw gateway start`（无环境变量）
- `openclaw gateway restart`（无环境变量）
- 手搓 `kill + nohup` 作为第一选择
- 未确认目标的 `launchctl unload/load`

**默认顺序**：
1. 只读检查
2. 备份
3. 使用正式救援链路
4. 复核

### 2. 绝不先改配置

**先确认四件事**：
1. 目标分身是谁
2. 活跃状态树是哪棵
3. 正式 LaunchAgent 指向哪套路径
4. 这是服务问题、索引问题、还是代理问题

### 3. 绝不自救

**当前分身 = 目标分身时**：
- 不执行正式救援
- 只做只读检查
- 让其他分身或外部操作员执行修复

### 4. 绝不把入口当对象

**要严格区分**：
- 分身（clone-1/clone-2/clone-3）
- 化身（main/coder/life 等）
- 入口（Discord/网页端/main::main）
- session（具体对话记录）

**冻结句**：
- 同一个分身下的不同入口，不是不同对象
- Discord 绑定 session 和 `main::main` 可能是同一化身的不同入口
- 网页端出现新记录，不等于应该新建主 session

---

## 📝 使用示例

### 示例 1：救援老大（完整流程）

```bash
# 执行救援
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-1

# 输出示例：
# ==========================================
#   OpenClaw 多实例救援脚本 v3.1.1
# ==========================================
# 
# === 救援目标 ===
# 实例：clone-1
# 配置：/Users/fengzhen/.openclaw/openclaw.json
# 状态：/Users/fengzhen/.openclaw
# 端口：18789
# Discord 频道 ID: 1474330612239171635
# 
# [步骤] 运行修复前检查清单...
# [✅] 所有检查项通过
# 
# [步骤] 备份配置...
# [✅] 已备份 plist
# [✅] 已备份 sessions.json
# [✅] 已备份配置
# 
# [步骤] 检查 LaunchAgent disabled 状态...
# [INFO] LaunchAgent 未被禁用
# 
# [步骤] 验证 LaunchAgent 配置...
# [✅] Label 正确：ai.openclaw.gateway
# [✅] OPENCLAW_CONFIG_PATH 正确
# [✅] OPENCLAW_STATE_DIR 正确
# [✅] OPENCLAW_LAUNCHD_LABEL 正确
# 
# [INFO] 停止 Gateway...
# [✅] Gateway 已停止
# 
# [INFO] 启动 Gateway...
# [✅] Gateway 已启动
# [✅] Gateway 可访问
# [✅] Discord 频道正确
# [✅] Token 已同步
# 
# ==========================================
#   救援完成报告
# ==========================================
```

### 示例 2：检查老二状态

```bash
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-2 status
```

### 示例 3：重启老三

```bash
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-3 restart
```

---

## 🐛 常见错误及避免方法

### 错误 1：环境变量污染

**症状**: 用老二配置启动了老大端口

**避免**: 始终显式设置环境变量（救援脚本已自动处理）

### 错误 2：LaunchAgent 混淆

**症状**: 停止了错误的实例

**避免**: 救援脚本会自动验证 LaunchAgent 标签

### 错误 3：Token 不同步

**症状**: Control UI 提示 token mismatch

**避免**: 救援脚本会自动同步 Token

### 错误 4：误把 CLI 看不到当 Session 没了

**症状**: Session 文件很多，但某个命令输出空

**避免**: 先信磁盘和 transcript 事实，救援指南 v3.1 有详细说明

### 错误 5：只配大写 NO_PROXY，忽略 no_proxy

**症状**: Feishu 仍可能误走代理

**避免**: 对有兼容性风险的网络栈，`NO_PROXY` 和 `no_proxy` 都要补

### 错误 6：LaunchAgent 被禁用

**症状**: `launchctl bootstrap` 后仍然无法启动

**避免**: v3.1.1 已自动检测并执行 `launchctl enable`

---

## 📚 相关文档

- [多 Gateway 配置指南](https://docs.openclaw.ai/gateway/multiple-gateways)
- [OpenClaw 多实例修复方法论 v0.1](~/openclaw-shared/memory/operations/runbooks/openclaw-multi-instance-repair-methodology-v0.1.md)
- [救援指南 v3.1](runbooks/rescue-guide-v3.1.md)
- [修复前检查清单](runbooks/preflight-checklist.md)

---

## 🔄 版本历史

### v3.1.2 (2026-03-29 收口最终版)
- ✅ [修复 P1] 移除 README 中的裸启动示例（改为正式托管链路说明）
- ✅ [修复 P1] 修复 hook 引用（移除不存在的脚本引用，改为示例配置）
- ✅ [修复 P2] 统一 runbook 版本号为 v3.1.2

### v3.1.1 (2026-03-29 收口修订)
- ✅ [修复 P1] 添加 launchd disabled 检测与恢复分支
  - 新增 `check_and_fix_launchd_disabled()` 函数
  - 自动检测 `launchctl print-disabled` 状态
  - 自动执行 `launchctl enable` 恢复
- ✅ [修复 P1] 修正 plist 环境变量校验
  - 改用 `EnvironmentVariables.OPENCLAW_CONFIG_PATH` 读取
  - 改用 `EnvironmentVariables.OPENCLAW_STATE_DIR` 读取
  - 改用 `EnvironmentVariables.OPENCLAW_LAUNCHD_LABEL` 读取
  - 新增 `Label` 验证
- ✅ [修复 P2] 统一文档入口路径
  - 全部统一为 `~/openclaw-shared/tools/rescue/rescue-agent.sh`
- ✅ [修复 P2] 清理旧版本引用
  - 删除 `rescue-guide-v3.md`（仅保留 v3.1）
  - 更新 checklist 引用为 `rescue-guide-v3.1.md`
  - 更新版本号引用

### v3.1 (2026-03-29 修订)
- ✅ [修复 P1] 去掉裸启动，改用正式托管链路（LaunchAgent）
- ✅ [修复 P1] 修正 sessions.json 路径为 `agents/main/sessions/sessions.json`
- ✅ [修复 P1] 移除 QClaw 支持（结构不同，需专用模式）
- ✅ [改进] Discord 校验改用频道 ID 匹配
- ✅ [改进] 自救检测增加 PWD 和上下文检查
- ✅ [改进] 软链接路径修正为 `~/openclaw-shared/tools/rescue/`

### v3.0 (2026-03-29)
- ✅ 整合 Codex 多实例修复方法论 v0.1
- ✅ 添加"硬规则"章节（绝不裸修/绝不先改配置/绝不自救/绝不把入口当对象）
- ✅ 添加标准排障顺序（5 步流程）
- ✅ 添加三层修复流程（服务层/索引层/通信层）
- ✅ 添加修复前检查清单（10 项）
- ✅ 更新救援脚本 v3.0（集成检查清单 + 自救检测）
- ✅ 添加常见错误及避免方法（5 个案例）

### v2.0 (2026-03-28)
- ✅ 支持多实例救援（clone-1/clone-2/clone-3）
- ✅ 显式设置环境变量，避免污染
- ✅ 自动验证 Discord 频道确认配置正确
- ✅ 自动同步 Token 文件

### v1.0 (2026-03-24)
- ✅ 初始版本（单实例救援）

---

## 👥 贡献者

- **方法论**: Codex（2026-03-29 夜间救援经验总结 + v3.1/v3.1.1 评审意见）
- **实现**: 老二（明微）
- **测试**: 老大/老二/老三（多实例环境验证）
- **评审**: Codex（v3.1/v3.1.1 修订指导）

---

## 📄 许可证

本技能包遵循 OpenClaw 技能共享协议，可自由使用、修改和分发。

---

**最后更新**: 2026-03-29  
**维护者**: 老二（明微）  
**反馈**: Discord @vinnfeng 或 GitHub Issues
