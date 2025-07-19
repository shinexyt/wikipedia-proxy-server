#!/usr/bin/env node

/**
 * Vercel配置验证脚本
 * 验证vercel.json配置是否符合最新要求
 */

import { readFileSync } from 'fs';

console.log('🔍 验证Vercel配置兼容性...\n');

try {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  
  console.log('📋 当前配置:');
  console.log(`   版本: ${config.version}`);
  console.log(`   项目名: ${config.name}`);
  
  // 检查配置冲突
  const hasRoutes = !!config.routes;
  const hasRewrites = !!config.rewrites;
  const hasHeaders = !!config.headers;
  const hasRedirects = !!config.redirects;
  const hasCleanUrls = !!config.cleanUrls;
  const hasTrailingSlash = !!config.trailingSlash;
  
  console.log('\n🔧 配置检查:');
  
  if (hasRoutes && (hasRewrites || hasHeaders || hasRedirects || hasCleanUrls || hasTrailingSlash)) {
    console.log('❌ 配置冲突: routes不能与rewrites/headers/redirects/cleanUrls/trailingSlash同时使用');
    console.log('💡 建议: 使用rewrites替代routes');
  } else {
    console.log('✅ 配置兼容: 无冲突');
  }
  
  if (hasRewrites) {
    console.log('✅ 使用rewrites配置');
    console.log(`   重写规则数量: ${config.rewrites.length}`);
  }
  
  if (hasHeaders) {
    console.log('✅ 使用headers配置');
    console.log(`   头部规则数量: ${config.headers.length}`);
  }
  
  if (config.functions) {
    console.log('✅ 函数配置存在');
    const functionPaths = Object.keys(config.functions);
    console.log(`   函数路径: ${functionPaths.join(', ')}`);
  }
  
  console.log('\n🏗️ 部署模式:');
  if (hasRewrites || hasHeaders) {
    console.log('✅ 现代Vercel配置 (推荐)');
  } else if (hasRoutes) {
    console.log('⚠️  传统routes配置 (可能有兼容性问题)');
  } else {
    console.log('⚠️  未检测到路由配置');
  }
  
  console.log('\n🚀 配置验证完成!');
  
} catch (error) {
  console.error('❌ 验证失败:', error.message);
  process.exit(1);
}
