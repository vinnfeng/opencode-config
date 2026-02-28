/**
 * Auto-Memory Plugin for Oh-My-OpenCode
 * 
 * 功能：对话后自动写入 memory/
 * 作者：CEO (修行者)
 * 创建：2026-02-25
 */

const fs = require('fs');
const path = require('path');

class AutoMemoryPlugin {
  constructor(ctx) {
    this.ctx = ctx;
    this.memoryPath = path.join(process.env.HOME, '.openclaw/workspace/memory/');
    this.importantKeywords = ['修行', '源码', '插件', '重要', '传道', '炼丹'];
    
    console.log('[AutoMemory] Plugin loaded');
  }

  // Hook: 对话结束后触发
  async onMessageComplete(message) {
    console.log('[AutoMemory] Message completed, auto-saving to memory/');
    
    const today = new Date().toISOString().split('T')[0];
    const memoryFile = path.join(this.memoryPath, `${today}.md`);
    
    // 确保目录存在
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }
    
    // 准备记忆内容
    const memoryContent = this.generateMemoryContent(message, today);
    
    // 追加到今日记忆
    this.appendToFile(memoryFile, memoryContent);
    
    console.log('[AutoMemory] Saved to', memoryFile);
    
    // 检测是否重要对话
    if (this.isImportant(message)) {
      this.saveToImportant(message, today);
    }
  }

  // 生成记忆内容
  generateMemoryContent(message, date) {
    return `
## ${date} ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}

**主题**：${this.extractTopic(message)}
**内容**：${message.content.substring(0, 500)}${message.content.length > 500 ? '...' : ''}

---
`;
  }

  // 提取主题
  extractTopic(message) {
    const firstLine = message.content.split('\n')[0];
    return firstLine.substring(0, 50);
  }

  // 检测重要对话
  isImportant(message) {
    return this.importantKeywords.some(keyword => 
      message.content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // 保存到重要目录
  saveToImportant(message, date) {
    const importantPath = path.join(this.memoryPath, 'important/');
    if (!fs.existsSync(importantPath)) {
      fs.mkdirSync(importantPath, { recursive: true });
    }
    
    const file = path.join(importantPath, `${date}-important.md`);
    const content = `# 重要对话 ${date}\n\n${message.content}\n`;
    
    fs.appendFileSync(file, content, 'utf-8');
    console.log('[AutoMemory] Saved to important:', file);
  }

  // 追加到文件
  appendToFile(file, content) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, `# ${file.split('/').pop().replace('.md', '')}\n\n`, 'utf-8');
    }
    fs.appendFileSync(file, content, 'utf-8');
  }
}

module.exports = AutoMemoryPlugin;
