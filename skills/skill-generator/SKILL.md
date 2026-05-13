---
name: standard-skill-generator
description: 自动生成符合 Mi Code Hub 规范的 Skill 目录结构。输入 Skill 名称、描述和核心功能，输出包含标准 SKILL.md、scripts/ 目录和 README.md 的完整 Skill 包。适用于快速创建标准化、可发布的 Skill。
---

# Standard Skill Generator (标准 Skill 生成器)

> **目标**：让任何 Agent 或人类都能一键生成符合 Mi Code Hub 规范的 Skill 骨架，无需手动创建目录和文件。

## 1. 核心功能
- **自动校验名称**：确保 Skill 名称符合 `kebab-case`（小写、连字符）。
- **生成标准结构**：
  - `SKILL.md`：包含规范的 YAML Frontmatter 和 Markdown 模板。
  - `scripts/`：存放脚本的目录。
  - `README.md`：可选，用于人类阅读。
- **内置最佳实践**：生成的 `SKILL.md` 包含 Description 编写指南（Trigger Logic）。

## 2. 使用方法

### 方式一：交互式生成（推荐）
直接告诉 Agent：
> "帮我创建一个名为 `my-new-skill` 的 Skill，描述是‘用于自动分析日志文件’，核心功能是一个 Python 脚本。"

Agent 会调用此 Skill 的脚本：
```bash
python scripts/generate_skill.py --name "my-new-skill" --description "用于自动分析日志文件" --type "python"
```

### 方式二：手动调用脚本
```bash
python scripts/generate_skill.py \
  --name "<skill-name>" \
  --description "<skill-description>" \
  --output-dir "<target-directory>" \
  --author "<your-name>"
```

## 3. 参数说明
- `--name`: Skill 名称（必填，只能包含小写字母、数字、连字符）。
- `--description`: Skill 描述（必填，用于 Agent 自动发现）。
- `--output-dir`: 生成目录（可选，默认为当前目录）。
- `--author`: 作者名称（可选，默认为当前用户）。
- `--type`: 脚本类型（可选，`python` / `bash` / `none`，默认为 `none`）。

## 4. 生成结果示例
```text
my-new-skill/
├── SKILL.md          # 核心入口
├── README.md         # 人类文档
└── scripts/          # 脚本目录
    └── main.py       # (如果指定 type=python)
```
