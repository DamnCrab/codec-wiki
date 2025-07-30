#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';

// ===== 配置区域 =====
// 默认API配置 (支持所有OpenAPI兼容的AI服务)
const DEFAULT_API_CONFIG = {
  // API基础URL (不包含路径)
  baseUrl: 'https://api.deepseek.com',
  // API路径
  apiPath: '/v1/chat/completions',
  // 模型名称
  model: 'deepseek-chat',
  // API密钥 (直接写死)
  apiKey: 'sk-8dbddf0eb3c64c8f90ac58935b210db1',
  // 温度设置
  temperature: 1.3,
  // 最大token数
  maxTokens: 8000
};

// 备用API配置 (可选)
const FALLBACK_API_CONFIG = {
  baseUrl: 'https://api.openai.com',
  apiPath: '/v1/chat/completions',
  model: 'gpt-4o-mini',
  // OpenAI API密钥 (如果需要备用)
  apiKey: '', // 留空或填入你的OpenAI密钥
  temperature: 0.1,
  maxTokens: 8000
};

// ===== 翻译规则 =====

// 翻译规则
const TRANSLATION_PROMPT = `You are a professional Chinese native translator specialized in video encoding and multimedia technology content who needs to fluently translate text into Chinese.

## Translation Rules
1. Output only the translated content, without explanations or additional content
2. Maintain all technical terminology, programming language syntax, and code snippets exactly as in the original
3. If the text contains HTML tags or MDX components, preserve their structure and placement while maintaining fluency
4. Preserve product names, company names, and technology abbreviations in their original form (e.g., AV1, HEVC, x264, FFmpeg)
5. Keep all UI elements, button names, and menu items as they appear in localized software when available
6. Translate technical concepts accurately while preserving their technical meaning
7. For video encoding terminology, use established Chinese translations:
   - "编码器" for encoder
   - "解码器" for decoder  
   - "编解码器" for codec
   - "比特率" for bitrate
   - "帧率" for framerate
   - "分辨率" for resolution
   - "质量" for quality
   - "压缩" for compression
   - "无损" for lossless
   - "有损" for lossy
   - "滤镜" for filter
   - "预设" for preset
   - "参数" for parameter
   - "算法" for algorithm
   - "硬件加速" for hardware acceleration
8. Maintain the original formatting, including frontmatter, code blocks, and markdown syntax
9. Do not translate file paths, URLs, or command-line parameters
10. Keep mathematical formulas and technical specifications in their original form`;

class TranslationAPI {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5秒
    this.primaryConfig = DEFAULT_API_CONFIG;
    this.fallbackConfig = FALLBACK_API_CONFIG;
  }

  // 构建完整的API URL
  buildApiUrl(config) {
    return `${config.baseUrl}${config.apiPath}`;
  }

  // 构建请求头
  buildHeaders(config) {
    if (!config.apiKey) {
      throw new Error(`API密钥未配置`);
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    };
  }

  // 发送HTTP请求
  async makeRequest(url, headers, data) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: headers
      }, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`API错误 ${res.statusCode}: ${parsed.error?.message || responseData}`));
            }
          } catch (error) {
            reject(new Error(`解析响应失败: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  // 调用OpenAPI兼容的AI API
  async callOpenAICompatibleAPI(config, content) {
    const url = this.buildApiUrl(config);
    const headers = this.buildHeaders(config);

    const requestData = {
      model: config.model,
      messages: [
        {
          role: 'system',
          content: TRANSLATION_PROMPT
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens
    };

    const response = await this.makeRequest(url, headers, requestData);
    return response.choices[0]?.message?.content;
  }

  // 翻译文本
  async translateText(content) {
    let lastError = null;
    
    // 首先尝试主要API (默认DeepSeek)
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`  尝试 ${this.primaryConfig.model} API (第 ${attempt} 次)`);
        
        const result = await this.callOpenAICompatibleAPI(this.primaryConfig, content);
        
        if (result) {
          console.log(`  ✅ ${this.primaryConfig.model} API 翻译成功`);
          return result;
        }
      } catch (error) {
        lastError = error;
        console.log(`  ❌ ${this.primaryConfig.model} API 失败 (第 ${attempt} 次): ${error.message}`);
        
        if (attempt < this.maxRetries) {
          console.log(`  等待 ${this.retryDelay / 1000} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    // 如果主要API失败，尝试备用API
    if (this.fallbackConfig && this.fallbackConfig.apiKey) {
      console.log(`  尝试备用 ${this.fallbackConfig.model} API...`);
      
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`  尝试 ${this.fallbackConfig.model} API (第 ${attempt} 次)`);
          
          const result = await this.callOpenAICompatibleAPI(this.fallbackConfig, content);
          
          if (result) {
            console.log(`  ⚠️ ${this.fallbackConfig.model} API 翻译成功 (备用)`);
            return result;
          }
        } catch (error) {
          lastError = error;
          console.log(`  ❌ ${this.fallbackConfig.model} API 失败 (第 ${attempt} 次): ${error.message}`);
          
          if (attempt < this.maxRetries) {
            console.log(`  等待 ${this.retryDelay / 1000} 秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          }
        }
      }
    } else {
      console.log(`  ⚠️ 备用API未配置或密钥未设置，跳过备用尝试`);
    }
    
    throw lastError || new Error('所有翻译API都失败了');
  }

  // 翻译文件
  async translateFile(inputPath, outputPath) {
    try {
      // 读取文件内容
      const content = fs.readFileSync(inputPath, 'utf8');
      console.log(`  文件大小: ${content.length} 字符`);
      
      // 检查内容是否过长
      if (content.length > 30000) {
        console.log(`  ⚠️ 文件过大，可能需要分块处理`);
      }
      
      // 翻译内容
      const translatedContent = await this.translateText(content);
      
      if (translatedContent) {
        // 创建输出目录
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 写入翻译结果
        fs.writeFileSync(outputPath, translatedContent, 'utf8');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`  翻译失败: ${error.message}`);
      return false;
    }
  }
}

export default TranslationAPI;