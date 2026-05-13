# OpenClaw 多实例救援指南 v3.1.2

**版本**: v3.1.2 (2026-03-29 收口最终版)  
**创建时间**: 2026-03-28  
**适用范围**: 老大（clone-1）、老二（clone-2）、老三（clone-3）  
**目的**: 固化 2026-03-28/29 夜间救援经验，降低多实例修复时的串线、误救、自救、索引误判和代理误伤风险。

---

## 一、先讲结论

这轮事故不是单点问题，而是三个问题反复叠加：

1. **多实例隔离没守住**
   - `OPENCLAW_CONFIG_PATH`
   - `OPENCLAW_STATE_DIR`
   - `gateway.port`
   - LaunchAgent `Label`
   - stdout/stderr 日志路径
   - 这些任一串线，都会出现"人在、魂不在""服务活着但不是这个分身"的假象。

2. **Session 问题容易被误判**
   - "CLI 列表为空"不等于"历史没了"
   - "`sessions.json` 有文件列表"不等于"主入口索引正常"
   - 修索引前必须先确认真正活跃状态树、关键 session、最近真实对话时间

3. **通信故障和启动故障不能混为一谈**
   - 端口未监听 = 启动/托管问题
   - 端口已监听但 Discord/飞书失败 = 通信/代理问题
   - 不能因为"收不到回复"就直接重建配置或重建索引

---

## 二、硬规则（必读）

### 2.1 绝不裸修

**禁止**默认使用：
- `openclaw gateway start`
- `openclaw gateway restart`
- 手搓 `kill + nohup` 作为第一选择
- 未确认目标的 `launchctl unload/load`

**默认顺序**：
1. 只读检查
2. 备份
3. 使用正式救援链路
4. 复核

### 2.2 绝不先改配置

**先确认四件事**：
1. 目标分身是谁
2. 活跃状态树是哪棵
3. 正式 LaunchAgent 指向哪套路径
4. 这是服务问题、索引问题、还是代理问题

### 2.3 绝不自救

**当前分身 = 目标分身时**：
- 不执行正式救援
- 只做只读检查
- 让其他分身或外部操作员执行修复

### 2.4 绝不把入口当对象

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

## 三、标准排障顺序

### 第一步：确认是不是"真故障"

**只读检查**：
```bash
bash ~/openclaw-shared/tools/rescue/verify-agent-health.sh clone-X
launchctl print gui/$(id -u)/<label>
lsof -nP -iTCP:<port> -sTCP:LISTEN
openclaw status --deep
tail -50 logs/gateway.log
tail -50 logs/gateway.err.log
```

**判定标准**：
- 端口不监听，才算启动层故障
- 端口监听但频道失败，归通信层
- Session 文件在但入口不对，归索引层

### 第二步：确认活跃状态树

**多实例必须逐项核对**：
- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_STATE_DIR`
- `gateway.port`
- logs 路径
- workspace 路径

**以最近活动证据判断活跃树**：
- `logs/gateway.log`（最近日志时间）
- `logs/gateway.err.log`
- `logs/gateway-rescue.log`
- `agents/main/sessions/*.jsonl`（最近 transcript 时间）
- `cron/jobs.json`

### 第三步：确认正式托管链路

**重点看 LaunchAgent**：
- `Label`
- `ProgramArguments`
- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_STATE_DIR`
- `OPENCLAW_LAUNCHD_LABEL`
- `StandardOutPath`
- `StandardErrorPath`

**如果出现**：
- 老大的 plist 指向老二状态树
- `Label` 和 `OPENCLAW_LAUNCHD_LABEL` 不一致
- clone-2 的 plist 文件直接消失

这类都属于**确定性故障**，可以修。

### 第四步：再看 Session

**Session 排查顺序**：
1. 先数真实 `.jsonl` 文件数量
2. 再找最近活跃 transcript（`tail -100 *.jsonl`）
3. 再确认关键入口（`agent:main:main` / Discord 绑定）
4. 最后才决定是否重建索引

**优先恢复的关键入口**：
- `agent:main:main`
- `agent:main:discord:channel:<频道 ID>`

**恢复准则**：
- 不能串人
- 不能把 cron/heartbeat 噪音顶成主入口
- 不能拿网页端临时新会话覆盖 Discord 主会话

### 第五步：最后才看代理

**代理只在这些情况下处理**：
- 服务已启动但 Discord/飞书失败
- 日志出现 `fetch failed`
- 日志出现 `The plain HTTP request was sent to HTTPS port`
- 本地代理端口存在但目标服务仍失败

**不要一上来就改代理本体**。

---

## 四、多实例配置清单

| 实例 | 配置路径 | 状态目录 | 端口 | LaunchAgent | Discord 频道 |
|------|---------|---------|------|-------------|-------------|
| **老大** (clone-1) | `~/.openclaw/openclaw.json` | `~/.openclaw/` | 18789 | `ai.openclaw.gateway` | 1474330612239171635 |
| **老二** (clone-2) | `~/openclaw-clone-2/openclaw.json` | `~/openclaw-clone-2/` | 19789 | `ai.openclaw.gateway.clone2` | 1477387046376177746 |
| **老三** (clone-3) | `~/openclaw-clone-3/openclaw.json` | `~/openclaw-clone-3/` | 19790 | `ai.openclaw.gateway.clone3` | 1477387158389133465 |

**注意**: QClaw 不支持（Electron 应用态，需专用救援模式）

---

## 五、正式修复流程

### 5.1 服务层修复

**适用条件**：
- 端口未监听
- `launchctl` 未加载
- plist 丢失、串线、标签不一致

**流程**：
```bash
# 1. 备份现有 plist
cp ~/Library/LaunchAgents/ai.openclaw.gateway.plist ~/Library/LaunchAgents/ai.openclaw.gateway.plist.bak

# 2. 修正或重建 plist（参考下方模板）
# 3. 核对 Label / OPENCLAW_LAUNCHD_LABEL
# 4. 核对 OPENCLAW_CONFIG_PATH / OPENCLAW_STATE_DIR
# 5. 用正式救援脚本重挂
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-1

# 6. 复核监听、日志、健康状态
bash ~/openclaw-shared/tools/rescue/verify-agent-health.sh clone-1
```

**LaunchAgent 模板（老大）**：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.gateway</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/Users/fengzhen/.nvm/versions/node/v22.22.0/bin/openclaw</string>
        <string>gateway</string>
        <string>--port</string>
        <string>18789</string>
    </array>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>OPENCLAW_CONFIG_PATH</key>
        <string>/Users/fengzhen/.openclaw/openclaw.json</string>
        <key>OPENCLAW_STATE_DIR</key>
        <string>/Users/fengzhen/.openclaw</string>
        <key>OPENCLAW_LAUNCHD_LABEL</key>
        <string>ai.openclaw.gateway</string>
    </dict>
    
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/Users/fengzhen/.openclaw/logs/gateway.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/fengzhen/.openclaw/logs/gateway.err.log</string>
</dict>
</plist>
```

### 5.2 索引层修复

**适用条件**：
- 关键 session 入口消失
- `.jsonl` 存在但入口无法继续用

**流程**：
```bash
# 1. 备份 sessions.json（修正路径）
cp ~/openclaw-clone-2/agents/main/sessions/sessions.json \
   ~/openclaw-clone-2/agents/main/sessions/sessions.json.bak

# 2. 确认关键 transcript
tail -100 ~/openclaw-clone-2/agents/main/sessions/*.jsonl | grep -A5 "timestamp"

# 3. 核对最近真实对话时间
# 4. 恢复关键入口（手动编辑 sessions.json 或使用 CLI）
# 5. 复核 CLI / Gateway 是否都能列出
openclaw sessions list
```

**注意**: `sessions.json` 的正确路径是 `$STATE_DIR/agents/main/sessions/sessions.json`（不是 `agents/main/sessions.json`）

### 5.3 通信层修复

**适用条件**：
- 服务正常
- Discord / Feishu 失败

**流程**：
```bash
# 1. 看日志是不是 fetch failed
tail -100 ~/openclaw-clone-2/logs/gateway.log | grep "fetch failed"

# 2. 看是不是代理不通
curl -v https://discord.com/api

# 3. 看是不是某域名该直连却走了代理
# 4. 只修确定性环境变量，不动无关代理配置

# 添加 NO_PROXY 和 no_proxy
export NO_PROXY="discord.com,discordapp.com,feishu.cn,larksuite.com,$NO_PROXY"
export no_proxy="discord.com,discordapp.com,feishu.cn,larksuite.com,$no_proxy"
```

---

## 六、这次验证过的正确做法

### 6.1 老大（clone-1）

**有效做法**：
- 先修正式 LaunchAgent 串线
- 不碰会话文件本体
- 保持 Discord 代理配置不变
- 只对 Feishu 补 `NO_PROXY` / `no_proxy`
- 重挂后再用 `verify-agent-health.sh` 和 `status --deep` 双重复核

**有效证据**：
- `launchctl state = running`
- `18789` 正在监听
- 日志出现 `logged in to discord`
- 日志出现 `feishu[main]: bot open_id resolved`
- Feishu 从 `WARN` 恢复为 `OK`

### 6.2 老二（clone-2）

**目前确认的经验**：
- 2026.3.24 后活跃状态树是根目录 `/Users/fengzhen/openclaw-clone-2`
- `.openclaw` 旧树并不是当前活跃树
- Session `.jsonl` 明明存在时，不能因为某个 CLI 输出空就认定历史没了
- clone-2 当前首先是**服务失管**，其次才是入口索引和通信问题

### 6.3 Session 修复

**有效做法**：
- 先认 Discord 绑定 session
- 再认 `main::main`
- 用最近 transcript 的真实事件时间校顺序
- 不把 cron、heartbeat、web 临时会话误认成主入口

---

## 七、这次踩过的错误

### 7.1 误把"服务存活"当"服务正常"

**错误表现**：
- 进程在
- 端口不在
- 或端口在但频道全挂

**教训**：
- 必须把 `launchctl`、监听端口、频道日志、健康探针分开看

### 7.2 误把"CLI 看不到"当"Session 没了"

**错误表现**：
- Session 文件很多
- 但某个命令输出空

**教训**：
- 先信磁盘和 transcript 事实
- 再解释 CLI 行为

### 7.3 误把"多入口"当"多对象"

**错误表现**：
- 把 Discord 主入口、网页入口、`main::main` 当成不同人

**教训**：
- 先分分身，再分化身，再分入口

### 7.4 修老二时把老大托管链路写串

**错误表现**：
- 老大的 `OPENCLAW_CONFIG_PATH` 正确
- 但 `OPENCLAW_STATE_DIR` 和日志路径跑到老二

**教训**：
- 修某个分身时，必须逐项核对 LaunchAgent 里的所有路径
- 不能只看配置文件路径

### 7.5 只配大写 `NO_PROXY`，忽略 `no_proxy`

**错误表现**：
- Feishu 仍可能误走代理
- 日志出现 HTTPS 端口被明文 HTTP 访问

**教训**：
- 对有兼容性风险的网络栈，`NO_PROXY` 和 `no_proxy` 都要补

### 7.6 用"修复经验"替代"现状证据"

**错误表现**：
- 老大的修法直接套给老二

**教训**：
- 经验只能指导检查顺序，不能替代现场取证

---

## 八、修复前检查清单（10 项）

**每次修复前必须逐项勾**：

- [ ] 我确认目标分身是谁（clone-1/clone-2/clone-3）
- [ ] 我确认当前不是在自救（当前分身 ≠ 目标分身）
- [ ] 我确认活跃状态树（配置路径/状态目录/端口）
- [ ] 我确认正式 LaunchAgent 标签
- [ ] 我确认 `OPENCLAW_CONFIG_PATH`
- [ ] 我确认 `OPENCLAW_STATE_DIR`
- [ ] 我确认日志路径
- [ ] 我确认是服务/索引/代理中的哪一类问题
- [ ] 我已完成备份（plist/sessions.json/配置）
- [ ] 我准备使用正式救援链路而不是裸命令

---

## 九、快速命令参考

```bash
# 救援实例
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-1

# 检查状态
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-2 status

# 重启实例
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-3 restart

# 验证健康
bash ~/openclaw-shared/tools/rescue/verify-agent-health.sh clone-1

# 检查端口
lsof -nP -iTCP:18789 -sTCP:LISTEN

# 检查 LaunchAgent
launchctl print gui/$(id -u)/ai.openclaw.gateway

# 查看日志
tail -100 ~/openclaw-clone-2/logs/gateway.log
```

---

## 十、相关文档

- [OpenClaw 多实例修复方法论 v0.1](./openclaw-multi-instance-repair-methodology-v0.1.md)
- [修复前检查清单](./preflight-checklist.md)
- [多 Gateway 配置指南](https://docs.openclaw.ai/gateway/multiple-gateways)

---

**版本**: v3.1.2 (2026-03-29 收口最终版)  
**作者**: 老二（明微）  
**方法论来源**: Codex（2026-03-29 夜间救援经验总结）  
**教训**: 救援时不要把自己搞死，不要串线，不要自救
