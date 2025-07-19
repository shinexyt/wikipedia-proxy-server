#!/usr/bin/env node

/**
 * 部署前检查脚本
 * 验证项目是否准备好部署到Vercel
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 正在检查Vercel部署配置...\n');

const checks = [];

// 检查必要文件
const requiredFiles = [
  'package.json',
  'index.js',
  'api/index.js',
  'vercel.json'
];

requiredFiles.forEach(file => {
  if (existsSync(file)) {
    checks.push(`✅ ${file} - 存在`);
  } else {
    checks.push(`❌ ${file} - 缺失`);
  }
});

// 检查package.json配置
try {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  
  if (pkg.type === 'module') {
    checks.push('✅ package.json - ES模块配置正确');
  } else {
    checks.push('❌ package.json - 缺少"type": "module"');
  }
  
  if (pkg.dependencies && pkg.dependencies['node-fetch']) {
    checks.push('✅ package.json - node-fetch依赖已安装');
  } else {
    checks.push('❌ package.json - 缺少node-fetch依赖');
  }
} catch (error) {
  checks.push('❌ package.json - 格式错误');
}

// 检查vercel.json配置
try {
  const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.builds) {
    checks.push('⚠️  vercel.json - 包含已弃用的builds配置');
  } else {
    checks.push('✅ vercel.json - 使用现代配置');
  }
  
  if (vercelConfig.functions) {
    checks.push('✅ vercel.json - 函数配置存在');
  } else {
    checks.push('❌ vercel.json - 缺少函数配置');
  }
} catch (error) {
  checks.push('❌ vercel.json - 格式错误');
}

// 输出检查结果
checks.forEach(check => console.log(check));

const failures = checks.filter(check => check.startsWith('❌')).length;
const warnings = checks.filter(check => check.startsWith('⚠️')).length;

console.log('\n📊 检查结果:');
console.log(`✅ 通过: ${checks.length - failures - warnings}`);
console.log(`❌ 失败: ${failures}`);
console.log(`⚠️  警告: ${warnings}`);

if (failures === 0) {
  console.log('\n🚀 项目准备就绪，可以部署到Vercel！');
  console.log('\n部署命令:');
  console.log('  vercel        # 部署到预览环境');
  console.log('  vercel --prod # 部署到生产环境');
} else {
  console.log('\n❌ 请修复上述问题后再部署');
  process.exit(1);
}
