#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TranslationAPI from './translation-api.js';

// ES6模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  // 源文档目录
  sourceDir: 'docs',
  // 中文翻译输出目录
  outputDir: 'i18n/zh/docusaurus-plugin-content-docs/current',
  // 支持的文件扩展名
  supportedExtensions: ['.md', '.mdx'],
  // 排除的目录
  excludeDirs: ['zh'],
  // API配置
  api: {
    preferredAPI: 'deepseek', // 'deepseek' 或 'openai'
    maxRetries: 3,
    retryDelay: 5000, // 5秒
  }
};

// 分类标签映射
const CATEGORY_LABELS = {
  'audio': '音频编解码器',
  'colorimetry': '色彩学',
  'data': '数据压缩',
  'encoders': '编码器',
  'encoders_hw': '硬件编码器',
  'filtering': '滤镜处理',
  'images': '图像格式',
  'introduction': '介绍',
  'metrics': '质量评估指标',
  'subtitles': '字幕',
  'utilities': '实用工具',
  'video': '视频编解码器'
};

class LocalTranslator {
  constructor() {
    this.translatedCount = 0;
    this.failedCount = 0;
    this.skippedCount = 0;
    this.translationAPI = new TranslationAPI();
  }

  // 获取所有需要翻译的文件
  getAllFiles(dir, basePath = '') {
    const files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // 跳过排除的目录
        if (!CONFIG.excludeDirs.includes(item)) {
          files.push(...this.getAllFiles(fullPath, relativePath));
        }
      } else if (stat.isFile()) {
        // 检查文件扩展名
        const ext = path.extname(item);
        if (CONFIG.supportedExtensions.includes(ext)) {
          files.push({
            input: path.join(CONFIG.sourceDir, relativePath),
            output: path.join(CONFIG.outputDir, relativePath),
            relativePath: relativePath
          });
        }
      }
    }

    return files;
  }

  // 检查文件是否需要翻译
  needsTranslation(file) {
    // 如果输出文件不存在，需要翻译
    if (!fs.existsSync(file.output)) {
      return true;
    }

    // 检查源文件是否比输出文件新
    const sourceStat = fs.statSync(file.input);
    const outputStat = fs.statSync(file.output);
    
    return sourceStat.mtime > outputStat.mtime;
  }

  // 翻译文件
  async translateFile(file) {
    console.log(`正在翻译: ${file.input}`);
    
    try {
      const success = await this.translationAPI.translateFile(file.input, file.output);
      
      if (success) {
        console.log(`✅ 翻译成功: ${file.output}`);
        this.translatedCount++;
        return true;
      } else {
        console.log(`❌ 翻译失败: ${file.input}`);
        this.failedCount++;
        return false;
      }
    } catch (error) {
      console.error(`❌ 翻译出错: ${file.input}`, error.message);
      this.failedCount++;
      return false;
    }
  }

  // 创建分类文件
  createCategoryFiles() {
    console.log('正在创建分类文件...');
    
    const categoriesCreated = [];
    
    // 遍历输出目录，为每个子目录创建分类文件
    const outputDir = CONFIG.outputDir;
    if (fs.existsSync(outputDir)) {
      const items = fs.readdirSync(outputDir);
      
      for (const item of items) {
        const itemPath = path.join(outputDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          const categoryFile = path.join(itemPath, '_category_.json');
          const label = CATEGORY_LABELS[item] || item;
          
          const categoryContent = {
            label: label,
            position: 1,
            link: {
              type: 'generated-index'
            }
          };
          
          fs.writeFileSync(categoryFile, JSON.stringify(categoryContent, null, 2), 'utf8');
          categoriesCreated.push(item);
        }
      }
    }
    
    console.log(`✅ 创建了 ${categoriesCreated.length} 个分类文件: ${categoriesCreated.join(', ')}`);
  }

  // 主翻译流程
  async run() {
    console.log('🚀 开始本地翻译流程...');
    console.log(`源目录: ${CONFIG.sourceDir}`);
    console.log(`输出目录: ${CONFIG.outputDir}`);
    console.log('📡 使用DeepSeek API进行翻译');
    
    // 获取所有文件
    const allFiles = this.getAllFiles(CONFIG.sourceDir);
    console.log(`找到 ${allFiles.length} 个文档文件`);
    
    // 过滤需要翻译的文件
    const filesToTranslate = allFiles.filter(file => this.needsTranslation(file));
    console.log(`需要翻译 ${filesToTranslate.length} 个文件`);
    
    if (filesToTranslate.length === 0) {
      console.log('✅ 所有文件都是最新的，无需翻译');
      return;
    }
    
    // 开始翻译
    console.log('\n开始翻译文件...');
    for (let i = 0; i < filesToTranslate.length; i++) {
      const file = filesToTranslate[i];
      console.log(`\n[${i + 1}/${filesToTranslate.length}]`);
      
      await this.translateFile(file);
      
      // 添加延迟以避免API速率限制
      if (i < filesToTranslate.length - 1) {
        console.log(`  等待 ${CONFIG.api.retryDelay / 1000} 秒...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.api.retryDelay));
      }
    }
    
    // 创建分类文件
    this.createCategoryFiles();
    
    // 输出统计信息
    console.log('\n📊 翻译统计:');
    console.log(`✅ 成功翻译: ${this.translatedCount} 个文件`);
    console.log(`❌ 翻译失败: ${this.failedCount} 个文件`);
    console.log(`⏭️ 跳过文件: ${this.skippedCount} 个文件`);
    
    if (this.failedCount > 0) {
      console.log('\n⚠️ 有文件翻译失败，请检查日志并重试');
      process.exit(1);
    } else {
      console.log('\n🎉 所有文件翻译完成！');
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方法: node local-translate.js [选项]

选项:
  --help, -h     显示帮助信息
  --force        强制重新翻译所有文件
  --dry-run      只显示需要翻译的文件，不执行翻译

示例:
  node local-translate.js                # 翻译需要更新的文件
  node local-translate.js --force        # 强制翻译所有文件
  node local-translate.js --dry-run      # 预览需要翻译的文件
`);
    return;
  }
  
  const translator = new LocalTranslator();
  
  if (args.includes('--dry-run')) {
    console.log('🔍 预览模式 - 只显示需要翻译的文件');
    const allFiles = translator.getAllFiles(CONFIG.sourceDir);
    const filesToTranslate = allFiles.filter(file => translator.needsTranslation(file));
    
    console.log(`\n需要翻译的文件 (${filesToTranslate.length} 个):`);
    filesToTranslate.forEach((file, index) => {
      console.log(`${index + 1}. ${file.input} -> ${file.output}`);
    });
    return;
  }
  
  if (args.includes('--force')) {
    console.log('🔄 强制模式 - 重新翻译所有文件');
    // 修改 needsTranslation 方法以强制翻译
    translator.needsTranslation = () => true;
  }
  
  await translator.run();
}

// 运行脚本 - 直接运行，因为这是一个独立脚本
main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

export default LocalTranslator;