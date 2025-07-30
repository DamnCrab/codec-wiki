# 本地翻译脚本使用指南

本地翻译脚本可以帮助您在本地环境中批量翻译Docusaurus文档，支持所有OpenAPI兼容的AI服务。

## 功能特性

- ✅ 统一支持所有OpenAPI兼容的AI服务
- ✅ 默认使用DeepSeek，可配置任意AI服务
- ✅ 自动检测需要翻译的文件（基于修改时间）
- ✅ 智能重试机制和备用API降级
- ✅ 自动创建中文分类文件
- ✅ 保持原始格式和技术术语
- ✅ 详细的翻译进度和统计信息

## 安装和配置

### 1. 环境要求

- Node.js 16+ 
- 有效的AI API密钥（DeepSeek、OpenAI、或其他OpenAPI兼容服务）

### 2. 配置API服务

#### 方式一：使用默认配置（推荐）
脚本默认使用DeepSeek服务，只需设置API密钥：

```bash
# Windows (PowerShell)
$env:DEEPSEEK_API_KEY="your_deepseek_api_key_here"

# Linux/Mac
export DEEPSEEK_API_KEY="your_deepseek_api_key_here"
```

#### 方式二：自定义AI服务
如需使用其他OpenAPI兼容的AI服务，可修改 `scripts/translation-api.js` 文件头的配置：

```javascript
// 默认API配置 (支持所有OpenAPI兼容的AI服务)
const DEFAULT_API_CONFIG = {
  baseUrl: 'https://your-ai-service.com',    // 修改为您的AI服务地址
  apiPath: '/v1/chat/completions',           // API路径
  model: 'your-model-name',                  // 模型名称
  apiKeyEnv: 'YOUR_API_KEY_ENV',            // 环境变量名
  temperature: 1.3,                          // 温度设置
  maxTokens: 8000                           // 最大token数
};
```

### 3. 支持的AI服务

脚本支持所有OpenAPI兼容的AI服务，包括但不限于：
- **DeepSeek** (默认)
- **OpenAI** (GPT-4, GPT-3.5等)
- **Azure OpenAI**
- **Anthropic Claude** (通过兼容接口)
- **Google Gemini** (通过兼容接口)
- **本地部署的模型** (如Ollama、vLLM等)

### 4. 永久设置环境变量

#### Windows
1. 右键点击"此电脑" → "属性"
2. 点击"高级系统设置"
3. 点击"环境变量"
4. 在"用户变量"中添加新变量：
   - 变量名：`DEEPSEEK_API_KEY`
   - 变量值：您的API密钥

#### Linux/Mac
在 `~/.bashrc` 或 `~/.zshrc` 中添加：
```bash
export DEEPSEEK_API_KEY="your_deepseek_api_key_here"
```

## 使用方法

### 基本用法

```bash
# 进入项目目录
cd f:\CODE\codec-wiki

# 运行翻译脚本（只翻译需要更新的文件）
node scripts/local-translate.js
```

### 高级用法

```bash
# 查看帮助信息
node scripts/local-translate.js --help

# 预览需要翻译的文件（不执行翻译）
node scripts/local-translate.js --dry-run

# 强制重新翻译所有文件
node scripts/local-translate.js --force
```

## 配置选项

### API配置

脚本使用统一的OpenAPI兼容接口，支持任意AI服务：

**当前默认配置**：
- **主要服务**: DeepSeek (`deepseek-chat`)
- **温度**: `1.3` (更有创造性的翻译)
- **备用服务**: OpenAI (`gpt-4o-mini`)
- **最大重试次数**: 3次
- **重试延迟**: 5秒

**自定义配置**：
您可以在 `scripts/translation-api.js` 文件头修改配置，支持：
- 任意OpenAPI兼容的AI服务
- 自定义模型名称和参数
- 灵活的备用服务配置

### 翻译规则

脚本使用专门的翻译规则，确保：
- 保持技术术语的准确性
- 维护原始格式和代码块
- 使用标准的中文技术翻译
- 不翻译文件路径、URL和命令参数

## 输出结构

翻译后的文件会保存到：
```
i18n/zh/docusaurus-plugin-content-docs/current/
├── audio/           # 音频编解码器
├── colorimetry/     # 色彩学
├── data/           # 数据压缩
├── encoders/       # 编码器
├── filtering/      # 滤镜处理
├── images/         # 图像格式
├── introduction/   # 介绍
├── metrics/        # 质量评估指标
├── subtitles/      # 字幕
├── utilities/      # 实用工具
└── video/          # 视频编解码器
```

每个目录都会自动创建 `_category_.json` 文件，包含中文标签。

## 常见问题

### Q: 如何获取DeepSeek API密钥？
A: 访问 [DeepSeek官网](https://platform.deepseek.com/) 注册账号并获取API密钥。

### Q: 翻译失败怎么办？
A: 脚本会自动重试3次，并尝试备用API。检查：
1. API密钥是否正确设置
2. 网络连接是否正常
3. API配额是否充足

### Q: 如何只翻译特定文件？
A: 可以手动删除不需要的翻译文件，脚本会检测并重新翻译缺失的文件。

### Q: 翻译质量如何控制？
A: 当前使用温度1.3，提供更自然的翻译。如需更保守的翻译，可以在 `translation-api.js` 中调整温度值。

## 与GitHub Actions的配合

使用本地翻译脚本后，GitHub Actions可以简化为只监听变更和部署：

1. **本地完成**: 使用此脚本完成初始翻译
2. **提交翻译**: 将翻译结果提交到仓库
3. **Actions监听**: GitHub Actions只处理增量更新和部署

## 性能优化

- **并发控制**: 脚本串行处理文件，避免API速率限制
- **智能检测**: 只翻译修改过的文件
- **缓存机制**: 基于文件修改时间的智能缓存
- **错误恢复**: 失败的文件可以单独重试

## 日志和监控

脚本提供详细的执行日志：
- 📊 翻译统计信息
- ✅ 成功翻译的文件
- ❌ 失败的文件和错误信息
- ⚠️ API降级和重试信息

## 示例输出

```
🚀 开始本地翻译流程...
源目录: docs
输出目录: i18n/zh/docusaurus-plugin-content-docs/current
找到 156 个文档文件
需要翻译 12 个文件

开始翻译文件...

[1/12]
正在翻译: docs/video/AV1.mdx
  文件大小: 3247 字符
  尝试 deepseek API (第 1 次)
  ✅ deepseek API 翻译成功
✅ 翻译成功: i18n/zh/docusaurus-plugin-content-docs/current/video/AV1.mdx
  等待 5 秒...

...

✅ 创建了 12 个分类文件: audio, video, encoders, ...

📊 翻译统计:
✅ 成功翻译: 12 个文件
❌ 翻译失败: 0 个文件
⏭️ 跳过文件: 0 个文件

🎉 所有文件翻译完成！
```