#!/usr/bin/env node

/**
 * 部署后端点测试脚本
 * 测试部署在Vercel上的API端点是否正常工作
 */

const BASE_URL = 'https://wikipedia-proxy-server.vercel.app';

const endpoints = [
  { path: '/', name: '首页' },
  { path: '/health', name: '健康检查' },
  { path: '/usage', name: '使用统计' },
  { path: '/api/wikipedia/en?action=query&format=json&titles=Test&prop=extracts&exintro=1&explaintext=1', name: 'API测试' }
];

console.log(`🌐 测试部署地址: ${BASE_URL}\n`);

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  try {
    const response = await fetch(url);
    const status = response.status;
    const statusText = response.statusText;
    
    if (status === 200) {
      console.log(`✅ ${endpoint.name} - ${status} ${statusText}`);
      
      // 对于API端点，显示部分响应内容
      if (endpoint.path.startsWith('/health') || endpoint.path.startsWith('/usage')) {
        const data = await response.json();
        console.log(`   📄 响应: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } else {
      console.log(`❌ ${endpoint.name} - ${status} ${statusText}`);
    }
  } catch (error) {
    console.log(`💥 ${endpoint.name} - 请求失败: ${error.message}`);
  }
  console.log(`   🔗 ${url}\n`);
}

async function runTests() {
  console.log('🔍 开始测试部署的端点...\n');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    // 添加小延迟避免速率限制
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('🏁 测试完成！');
  console.log('💡 如果健康检查和使用统计返回404，说明需要重新部署以应用新的路由配置。');
}

// 检查是否在Node.js环境中运行
if (typeof fetch === 'undefined') {
  console.log('⚠️  需要Node.js 18+或安装node-fetch');
  console.log('💡 或者手动访问以下链接测试：');
  endpoints.forEach(endpoint => {
    console.log(`   ${BASE_URL}${endpoint.path}`);
  });
} else {
  runTests().catch(console.error);
}
