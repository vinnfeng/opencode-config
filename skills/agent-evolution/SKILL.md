# Agent 自进化机制 - Agent Skills

**版本**: v1.0  
**创建时间**: 2026-03-30  
**用途**: 提升 AI Agent 实现自进化机制的成功率

---

## 📌 技能概述

本 Skills 提供 Agent 自进化机制的实现指南，帮助 AI Agent 快速掌握如何让 Agent 随着使用慢慢积累方法。

**核心能力**:
- 三种进化方式（FIX/DERIVED/CAPTURED）
- 工作流蒸馏机制（Combo 生成）
- 混合检索与长期记忆
- Tool Guard 安全机制

---

## 🎯 使用场景

### 场景 1: 设计自进化 Agent

**用户**: "如何让客服 Agent 自己学习进步？"

**AI 思考过程**:
1. 识别任务类型：Agent 设计
2. 选择机制：三种进化方式
3. 应用场景：客服对话

**AI 执行**:
```markdown
# 为客服 Agent 添加自进化能力

## 1. FIX 机制（修复）
当用户投诉时：
- 分析根因（话术不当/流程错误/权限不足）
- 更新话术库
- 标记为"已修复"

## 2. DERIVED 机制（派生）
遇到新问题类型时：
- 从已有处理流程派生新分支
- 形成"问题类型→处理流程"映射

## 3. CAPTURED 机制（捕获）
成功解决问题后：
- 记录完整对话和处理流程
- 沉淀为标准流程
- 下次遇到类似问题直接复用
```

**Skills 指导**:
- FIX 用于修复错误
- DERIVED 用于扩展能力边界
- CAPTURED 用于沉淀成功经验

---

### 场景 2: 实现工作流蒸馏

**用户**: "我想让 Agent 自动学会我的工作流程"

**AI 思考过程**:
1. 识别任务类型：工作流自动化
2. 选择机制：工作流蒸馏（Combo 生成）
3. 实现步骤：记录→识别→推荐→执行

**AI 执行**:
```javascript
// 1. 记录用户操作
const recorder = new ComboRecorder();
recorder.startRecording('task-001', 'user-123');
recorder.recordStep({
  action: '打开文件',
  tool: 'file-manager',
  params: { path: '/path/to/file.md' }
});
recorder.endRecording('success', ['output.md']);

// 2. 识别重复模式
const miner = new ComboMiner();
const patterns = miner.identifyPatterns(tasks, 0.7, 3);

// 3. 推荐保存为 Combo
if (patterns.length > 0) {
  const combo = manager.saveCombo(patterns[0], '文件整理流程');
  console.log(`已保存 Combo: ${combo.name}`);
}

// 4. 下次推荐
const recommendations = manager.recommendCombos(currentTask, 0.7);
```

**Skills 指导**:
- 相似度阈值建议 0.7
- 最小频率建议 3 次
- 推荐前必须用户确认

---

### 场景 3: 实现混合检索

**用户**: "如何让 Agent 既能模糊搜索又能精确查找？"

**AI 思考过程**:
1. 识别任务类型：记忆检索
2. 选择机制：混合检索（向量+BM25）
3. 权重配置：0.7 + 0.3

**AI 执行**:
```javascript
function hybridSearch(query, documents) {
  // 向量语义搜索 (0.7) - 理解模糊意图
  const vectorResults = vectorSearch(query, documents);
  
  // BM25 全文搜索 (0.3) - 精确关键词匹配
  const bm25Results = bm25Search(query, documents);
  
  // 加权合并
  const merged = mergeResults(vectorResults, bm25Results, 0.7, 0.3);
  
  return merged.slice(0, 5); // 返回 Top 5
}

// 使用示例
const results = hybridSearch("上次那个大模型文档", documents);
// 既能理解"上次那个"（语义），也能匹配"大模型"（关键词）
```

**Skills 指导**:
- 向量检索适合模糊意图
- BM25 适合精确查找
- 权重可根据场景调整

---

## ⚠️ 安全规则

### 规则 1: Tool Guard 必须启用

```javascript
// 错误示例 ❌
executeTool('delete_file', { path: '/important/data' });

// 正确示例 ✅
const guard = new ToolGuard();
if (guard.check('delete_file', { path: '/important/data' })) {
  // CRITICAL/HIGH级别会被拦截
  executeTool('delete_file', { path: '/important/data' });
} else {
  console.warn('操作被 Tool Guard 拦截');
}
```

### 规则 2: Dry-run 预览副作用

```javascript
// 错误示例 ❌
executeCombo('delete-old-files');

// 正确示例 ✅
executeCombo('delete-old-files', { dryRun: true });
// 预览：将要删除 47 个文件
// 用户确认后
executeCombo('delete-old-files', { dryRun: false });
```

### 规则 3: 权限检查

```javascript
// 错误示例 ❌
addMemory('global', '敏感信息');

// 正确示例 ✅
if (checkScope('memory:write')) {
  addMemory('global', '敏感信息');
} else {
  console.error('缺少 memory:write 权限');
  console.error('修复：请求用户授权 memory:write scope');
}
```

---

## 📋 命令清单

### 进化方式

| 方式 | 用途 | 触发条件 | 示例 |
|------|------|---------|------|
| FIX | 修复失败 | 任务执行失败 | 分析根因→更新话术 |
| DERIVED | 派生新能力 | 遇到相似任务 | 从 A 流程派生出 B 流程 |
| CAPTURED | 捕获成功 | 任务成功完成 | 记录执行路径→沉淀为 Skill |

### 工作流蒸馏

| 步骤 | 组件 | 说明 |
|------|------|------|
| 记录 | IComboRecorder | 记录用户操作步骤 |
| 识别 | IComboMiner | 识别重复模式 |
| 推荐 | IComboManager | 推荐保存为 Combo |
| 执行 | IComboManager | 执行 Combo |
| 进化 | IComboEvolver | FIX/DERIVED/CAPTURED |

### 检索机制

| 方式 | 权重 | 适用场景 |
|------|------|---------|
| 向量语义搜索 | 0.7 | 模糊意图理解 |
| BM25 全文搜索 | 0.3 | 精确关键词定位 |

---

## 🔧 常见错误及修复

### 错误 1: 进化失败

```javascript
// 错误
// Agent 重复犯同样的错误

// 原因
// FIX 机制未启用或根因分析不准确

// 修复
// 1. 启用 FIX 机制
// 2. 改进根因分析算法
// 3. 建立错误知识库
```

### 错误 2: 蒸馏过度

```javascript
// 错误
// 保存了大量无用的 Combo

// 原因
// 相似度阈值过低或最小频率过低

// 修复
// 1. 提高相似度阈值（0.7 → 0.8）
// 2. 提高最小频率（3 → 5）
// 3. 定期清理无用 Combo
```

### 错误 3: 检索不准

```javascript
// 错误
// 搜索结果不相关

// 原因
// 权重配置不合理或 embedding 质量差

// 修复
// 1. 调整权重（向量 0.7 → 0.8，BM25 0.3 → 0.2）
// 2. 改进 embedding 模型
// 3. 添加用户反馈机制
```

---

## 📚 最佳实践

### 实践 1: 渐进式进化

```javascript
// 阶段 1: 冷启动（0-2 次）
// 无推荐，仅记录

// 阶段 2: 初期（3-5 次）
// 开始推荐，精度一般

// 阶段 3: 成熟（6-10 次）
// 推荐精准，可复用

// 阶段 4: 专家（10+ 次）
// 自动优化，派生分支
```

### 实践 2: 用户确认机制

```javascript
// 推荐保存为 Combo 时
if (shouldRecommend(pattern)) {
  const confirmed = await userConfirm({
    title: '保存为 Combo',
    description: `检测到您已完成${pattern.frequency}次相似的"${pattern.name}"任务`,
    preview: pattern.steps
  });
  
  if (confirmed) {
    manager.saveCombo(pattern, pattern.name);
  }
}
```

### 实践 3: 可解释性

```javascript
// 推荐 Combo 时提供解释
function recommendCombos(task) {
  const combos = manager.listCombos();
  const recommendations = combos.map(combo => ({
    ...combo,
    similarity: calculateSimilarity(task, combo),
    reason: `与您当前任务的相似度为${(combo.similarity * 100).toFixed(0)}%`,
    usageCount: combo.usageCount,
    successRate: combo.successRate
  }));
  
  return recommendations.sort((a, b) => b.similarity - a.similarity);
}
```

---

## 🚀 快速参考

### 安装

```bash
# 安装能力包
unzip 015-Agent 自进化机制.zip \
  -d ~/openclaw-shared/skill-pack/00-Methodology/
```

### 使用

```javascript
// 1. 引入组件
const { ComboRecorder, ComboMiner, ComboManager } = require('agent-self-evolution');

// 2. 初始化
const recorder = new ComboRecorder();
const miner = new ComboMiner();
const manager = new ComboManager();

// 3. 开始记录
recorder.startRecording(taskId, userId);

// 4. 识别模式
const patterns = miner.identifyPatterns(tasks, 0.7, 3);

// 5. 保存 Combo
manager.saveCombo(patterns[0], '工作流名称');
```

---

**维护人**: 老二（明微）  
**状态**: 🟢 v1.0 已创建  
**下次更新**: 实现机制落地后
