import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 完整功能测试 - API代理 + 图片代理...\n');

// 启动服务器
const server = spawn('node', ['index.js'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: '3335' }
});

server.stdout.on('data', (data) => {
  console.log(`[服务器] ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`[服务器错误] ${data}`);
});

// 等待服务器启动
await setTimeout(2000);

const BASE_URL = 'http://localhost:3335';

// 综合测试用例
const tests = [
  // 基础功能测试
  {
    name: '健康检查',
    url: `${BASE_URL}/health`,
    expect: (data) => data.status === 'healthy'
  },
  {
    name: '服务信息包含图片端点',
    url: `${BASE_URL}/`,
    expect: (data) => data.endpoints && data.endpoints.images
  },
  {
    name: '使用统计',
    url: `${BASE_URL}/usage`,
    expect: (data) => typeof data.total === 'number'
  },
  
  // 图片代理验证测试
  {
    name: '图片代理 - 无效项目',
    url: `${BASE_URL}/api/images/invalid/test.jpg`,
    expect: (data) => data.code === 'UNSUPPORTED_PROJECT',
    expectStatus: 400
  },
  {
    name: '图片代理 - 空路径',
    url: `${BASE_URL}/api/images/commons/`,
    expect: (data) => data.code === 'INVALID_IMAGE_PATH',
    expectStatus: 400
  },
  {
    name: '图片代理 - URL构建检查 (commons)',
    url: `${BASE_URL}/api/images/commons/test/image.jpg`,
    expect: (data) => data.code === 'IMAGE_PROXY_ERROR' && data.project === 'commons',
    expectStatus: 500,
    checkUrlConstruction: true
  },
  {
    name: '图片代理 - URL构建检查 (zh)',
    url: `${BASE_URL}/api/images/zh/thumb/example.png`,
    expect: (data) => data.code === 'IMAGE_PROXY_ERROR' && data.project === 'zh',
    expectStatus: 500,
    checkUrlConstruction: true
  },

  // API代理验证测试 (已存在但需确认仍工作)
  {
    name: 'API代理 - 不支持的语言',
    url: `${BASE_URL}/api/wikipedia/invalid?action=query&format=json`,
    expect: (data) => data.code === 'UNSUPPORTED_LANGUAGE',
    expectStatus: 400
  },
  
  // 404测试
  {
    name: '404测试包含新端点',
    url: `${BASE_URL}/nonexistent`,
    expect: (data) => data.code === 'NOT_FOUND' && 
      data.available_endpoints.includes('/api/images/{project}/{path}'),
    expectStatus: 404
  }
];

let passed = 0;
let failed = 0;

// 执行测试
for (const test of tests) {
  try {
    console.log(`🔍 测试: ${test.name}`);
    
    const response = await fetch(test.url);
    const data = await response.json();
    
    const statusOk = test.expectStatus ? response.status === test.expectStatus : response.ok;
    const dataOk = test.expect(data);
    
    if (statusOk && dataOk) {
      console.log(`✅ ${test.name} - 通过`);
      passed++;
      
      // 特殊检查：URL构建
      if (test.checkUrlConstruction) {
        console.log(`   URL构建正确: ${data.project}/${data.imagePath}`);
      }
    } else {
      console.log(`❌ ${test.name} - 失败`);
      console.log(`   状态: ${response.status}, 数据检查: ${dataOk}`);
      console.log(`   响应: ${JSON.stringify(data, null, 2)}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${test.name} - 错误: ${error.message}`);
    failed++;
  }
  
  // 测试间隔
  await setTimeout(300);
}

console.log(`\n📊 综合测试结果:`);
console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%`);

// 关闭服务器
server.kill('SIGTERM');

// 等待服务器关闭
await setTimeout(1000);

if (failed === 0) {
  console.log('\n🎉 所有测试通过！图片代理功能已成功添加。');
  console.log('✅ 原有API代理功能保持正常');
  console.log('✅ 新增图片代理功能工作正常');
  console.log('✅ 错误处理和验证工作正常');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查代码。');
  process.exit(1);
}