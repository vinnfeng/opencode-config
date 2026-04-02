# OpenCode Config Strategy (OC-CS) 🚀

这就是咱们的 OpenCode 配置文件长期维护方案。为了确保你在家里、公司、甚至任何地方都能第一时间用上最强、最稳的模型组合，我们采用了「分支分层管理」的架构。

---

## 📂 分支架构设计 (Branch Strategy)

| 分支名称 | 定位 | 维护内容 | 更新频率 |
| :--- | :--- | :--- | :--- |
| **`model-strategy`** | **主线/大脑** | **SOTA 模型选择与 Category 路由策略。** 排除特定环境路径，只管哪个模型最聪明、哪个最快、怎么降级。 | **随 AI 厂商更新同步** |
| **`office-windows`** | **公司/本地化** | 基于 `model-strategy` 的 **Windows 环境适配版**。包含公司机器的 MCP 路径、API Key (通过环境变量) 等。 | 随主线更新 + 环境变更 |
| **`main` (home-mac)** | **家里/本地化** | 维持原样，对应 macOS 的本地路径与配置。 | 随主线更新 + 环境变更 |

---

## 🧠 2026 Q2 模型池选择 (Core Philosophy)

我们遵循「领域最优」原则，充分利用 **Mify (小米内部平台)** 的免费额度：

1.  **逻辑高地 (`ultrabrain`)**：锁定 **Claude 4.6 Opus**。虽然 GPT-5.4 已经发布，但 Opus 在「深度思考」和「多步逻辑推理」上的严密性依然无可替代。
2.  **视觉先锋 (`visual-engineering`)**：锁定 **Gemini 3.1 Pro**。它的多模态能力在处理 UI 重构、截图转代码时，像素级的理解力极强。
3.  **工程骨干 (`deep`)**：**Claude 4.6 Sonnet**。吞吐量大、逻辑扎实，适合大规模代码实现。
4.  **弹性冗余 (Fallback Chain)**：主力失效时，自动滑向 **GPT-5.4 Pro**，底层由 **百炼 (GLM-5 / Qwen-3.5)** 提供国产化的稳定性冗余。

---

## 🛠 如何使用 (How to use)

### 1. 想要更新模型组合？
在 `model-strategy` 分支修改 `oh-my-opencode.json`，然后将改动 **Merge** 到各个本地化分支（`office-windows` / `main`）。

### 2. 在新环境部署？
1.  切出新分支：`git checkout -b local-env-name model-strategy`
2.  配置本地 MCP 路径：修改 `opencode.json` 中的 `command` 路径。
3.  启动 OpenCode。

### 3. 给 Sisyphus 的指令
你可以直接对我说：*"Sisyphus，把目前的模型策略主线更新到最新状态，检查一下 GPT-5.4 的最新评测数据是否有变。"*

---

## 📅 更新记录
- **2026-04-02**: 初始化分支架构，引入 Claude 4.6 + Gemini 3.1 最佳实践，建立 `model-strategy` 主线。

---
*Created with ❤️ by Sisyphus & vinnfeng*
