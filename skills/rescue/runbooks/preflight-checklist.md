# OpenClaw 救援前检查清单 (Preflight Checklist)

**版本**: v1.1.1 (2026-03-29 收口修订)  
**创建时间**: 2026-03-29  
**用途**: 每次救援前必须逐项勾选，确保不犯低级错误

---

## 📋 检查清单（10 项）

### 1. 确认目标分身

- [ ] **我确认目标分身是谁**（clone-1/clone-2/clone-3）
- [ ] **我知道目标分身的配置路径**
  - clone-1: `~/.openclaw/openclaw.json`
  - clone-2: `~/openclaw-clone-2/openclaw.json`
  - clone-3: `~/openclaw-clone-3/openclaw.json`

**验证命令**：
```bash
# 确认配置文件存在
ls -la ~/.openclaw/openclaw.json 2>/dev/null && echo "✅ clone-1" || echo "❌ clone-1"
ls -la ~/openclaw-clone-2/openclaw.json 2>/dev/null && echo "✅ clone-2" || echo "❌ clone-2"
ls -la ~/openclaw-clone-3/openclaw.json 2>/dev/null && echo "✅ clone-3" || echo "❌ clone-3"
```

---

### 2. 确认不是自救

- [ ] **我确认当前不是在自救**（当前分身 ≠ 目标分身）

**规则**：
- 老二不能救自己（只能做只读检查）
- 老大不能救自己（只能做只读检查）
- 必须让其他分身或外部操作员执行修复

**验证命令**：
```bash
# 确认当前分身
echo "当前配置路径：$OPENCLAW_CONFIG_PATH"

# 如果是自救，停止！
if [ "$OPENCLAW_CONFIG_PATH" = "/Users/fengzhen/openclaw-clone-2/openclaw.json" ] && [ "$TARGET" = "clone-2" ]; then
  echo "❌ 自救检测！请让老大或老三执行救援"
  exit 1
fi
```

---

### 3. 确认活跃状态树

- [ ] **我确认活跃状态树**（配置路径/状态目录/端口）

**验证命令**：
```bash
# 检查配置路径
cat ~/openclaw-clone-2/openclaw.json | jq '.gateway.port'

# 检查状态目录
ls -la ~/openclaw-clone-2/agents/main/sessions/ | head -10

# 检查日志路径
ls -la ~/openclaw-clone-2/logs/ | tail -5
```

---

### 4. 确认 LaunchAgent 标签

- [ ] **我确认正式 LaunchAgent 标签**

**标签映射**：
- clone-1: `ai.openclaw.gateway`
- clone-2: `ai.openclaw.gateway.clone2`
- clone-3: `ai.openclaw.gateway.clone3`

**验证命令**：
```bash
# 检查 LaunchAgent 状态
launchctl list | grep "ai.openclaw"

# 检查 plist 文件
ls -la ~/Library/LaunchAgents/ai.openclaw.gateway*.plist
```

---

### 5. 确认 OPENCLAW_CONFIG_PATH

- [ ] **我确认 `OPENCLAW_CONFIG_PATH`**

**验证命令**：
```bash
# 检查 plist 中的配置
cat ~/Library/LaunchAgents/ai.openclaw.gateway.clone2.plist | grep -A1 "OPENCLAW_CONFIG_PATH"
```

---

### 6. 确认 OPENCLAW_STATE_DIR

- [ ] **我确认 `OPENCLAW_STATE_DIR`**

**验证命令**：
```bash
# 检查 plist 中的状态目录
cat ~/Library/LaunchAgents/ai.openclaw.gateway.clone2.plist | grep -A1 "OPENCLAW_STATE_DIR"
```

---

### 7. 确认日志路径

- [ ] **我确认日志路径**

**验证命令**：
```bash
# 检查 plist 中的日志路径
cat ~/Library/LaunchAgents/ai.openclaw.gateway.clone2.plist | grep -E "(StandardOutPath|StandardErrorPath)"
```

---

### 8. 确认问题类型

- [ ] **我确认是服务/索引/代理中的哪一类问题**

**判定标准**：
- **服务层**：端口未监听 / LaunchAgent 未加载
- **索引层**：Session 入口消失 / CLI 输出异常
- **通信层**：服务正常但 Discord/飞书失败

**验证命令**：
```bash
# 检查端口
curl -s http://127.0.0.1:19789/ >/dev/null && echo "✅ 端口可访问" || echo "❌ 端口不可访问"

# 检查 LaunchAgent
launchctl print gui/$(id -u)/ai.openclaw.gateway.clone2 2>&1 | grep "state"

# 检查日志
tail -50 ~/openclaw-clone-2/logs/gateway.log | grep -E "(discord|feishu|fetch failed)"
```

---

### 9. 确认已完成备份

- [ ] **我已完成备份**（plist/sessions.json/配置）

**备份命令**：
```bash
# 备份 plist
cp ~/Library/LaunchAgents/ai.openclaw.gateway.clone2.plist \
   ~/Library/LaunchAgents/ai.openclaw.gateway.clone2.plist.bak.$(date +%Y%m%d%H%M%S)

# 备份 sessions.json（修正路径）
cp ~/openclaw-clone-2/agents/main/sessions/sessions.json \
   ~/openclaw-clone-2/agents/main/sessions/sessions.json.bak.$(date +%Y%m%d%H%M%S)

# 备份配置
cp ~/openclaw-clone-2/openclaw.json \
   ~/openclaw-clone-2/openclaw.json.bak.$(date +%Y%m%d%H%M%S)

echo "✅ 备份完成"
ls -la ~/Library/LaunchAgents/*.bak.* | tail -3
```

---

### 10. 确认使用正式救援链路

- [ ] **我准备使用正式救援链路而不是裸命令**

**正确做法**：
```bash
# ✅ 使用正式救援脚本
bash ~/openclaw-shared/tools/rescue/rescue-agent.sh clone-2
```

**错误做法**：
```bash
# ❌ 裸命令（禁止！）
openclaw gateway start
openclaw gateway restart
kill -9 $(lsof -t -i:19789)
```

---

## 🚦 检查结果处理

### 全部通过（10/10）
```
✅ 所有检查项通过，可以开始救援
```

### 部分通过（<10 项）
```
⚠️  有检查项未通过，请先解决以下问题：
- [列出未通过的项目]
```

### 发现自救情况
```
❌ 自救检测！当前分身 = 目标分身
请立即停止，并让其他分身执行救援
```

---

## 📝 检查记录模板

```markdown
## 救援前检查记录

**时间**: YYYY-MM-DD HH:MM
**操作员**: （分身名称）
**目标**: clone-X

### 检查结果
- [ ] 1. 确认目标分身
- [ ] 2. 确认不是自救
- [ ] 3. 确认活跃状态树
- [ ] 4. 确认 LaunchAgent 标签
- [ ] 5. 确认 OPENCLAW_CONFIG_PATH
- [ ] 6. 确认 OPENCLAW_STATE_DIR
- [ ] 7. 确认日志路径
- [ ] 8. 确认问题类型
- [ ] 9. 确认已完成备份
- [ ] 10. 确认使用正式救援链路

**结果**: ✅ 通过 / ⚠️  部分通过 / ❌ 失败

**备注**: （如有异常，记录在此）
```

---

## 🔗 相关文档

- [救援指南 v3.1](./rescue-guide-v3.1.md)
- [多实例修复方法论 v0.1](./openclaw-multi-instance-repair-methodology-v0.1.md)

---

**版本**: v1.1.1 (2026-03-29 收口修订)  
**创建时间**: 2026-03-29  
**强制使用**: 每次救援前必须逐项勾选
