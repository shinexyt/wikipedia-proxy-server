import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🖼️  测试维基百科图片代理功能...\n');

// 启动服务器
const server = spawn('node', ['index.js'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: '3334' }
});

server.stdout.on('data', (data) => {
  console.log(`[服务器] ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`[服务器错误] ${data}`);
});

// 等待服务器启动
await setTimeout(2000);

const BASE_URL = 'http://localhost:3334';

// 图片代理测试用例
const imageTests = [
  {
    name: '基本图片代理端点检查',
    url: `${BASE_URL}/api/images/commons/1/1a/Wikipedia-logo-v2.svg`,
    expectImage: true,
    expectStatus: 200
  },
  {
    name: '错误的项目名称',
    url: `${BASE_URL}/api/images/invalid/test.jpg`,
    expectJson: true,
    expect: (data) => data.code === 'UNSUPPORTED_PROJECT',
    expectStatus: 400
  },
  {
    name: '空的图片路径',
    url: `${BASE_URL}/api/images/commons/`,
    expectJson: true,
    expect: (data) => data.code === 'INVALID_IMAGE_PATH',
    expectStatus: 400
  },
  {
    name: '中文维基图片',
    url: `${BASE_URL}/api/images/zh/thumb/1/1a/Example.jpg/100px-Example.jpg`,
    expectImage: true,
    expectStatus: 200
  },
  {
    name: '英文维基图片',
    url: `${BASE_URL}/api/images/en/thumb/1/1a/Example.jpg/100px-Example.jpg`,
    expectImage: true,
    expectStatus: 200
  }
];

let passed = 0;
let failed = 0;

// 执行图片代理测试
for (const test of imageTests) {
  try {
    console.log(`🔍 测试: ${test.name}`);
    
    const response = await fetch(test.url);
    
    const statusOk = test.expectStatus ? response.status === test.expectStatus : response.ok;
    
    let dataOk = true;
    if (test.expectJson) {
      const data = await response.json();
      dataOk = test.expect ? test.expect(data) : true;
      console.log(`   JSON响应: ${JSON.stringify(data, null, 2)}`);
    } else if (test.expectImage) {
      const contentType = response.headers.get('content-type');
      dataOk = contentType && contentType.startsWith('image/');
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Headers: X-Proxy-Server=${response.headers.get('x-proxy-server')}, X-Source-Project=${response.headers.get('x-source-project')}`);
    }
    
    if (statusOk && dataOk) {
      console.log(`✅ ${test.name} - 通过`);
      passed++;
    } else {
      console.log(`❌ ${test.name} - 失败`);
      console.log(`   状态: ${response.status} (期望: ${test.expectStatus}), 数据检查: ${dataOk}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${test.name} - 错误: ${error.message}`);
    failed++;
  }
  
  // 测试间隔
  await setTimeout(500);
}

// 测试端点信息更新
try {
  console.log(`🔍 测试: 端点信息包含图片API`);
  const response = await fetch(`${BASE_URL}/`);
  const data = await response.json();
  
  if (data.endpoints && data.endpoints.images) {
    console.log(`✅ 端点信息包含图片API - 通过`);
    passed++;
  } else {
    console.log(`❌ 端点信息包含图片API - 失败`);
    console.log(`   端点信息: ${JSON.stringify(data.endpoints, null, 2)}`);
    failed++;
  }
} catch (error) {
  console.log(`❌ 端点信息包含图片API - 错误: ${error.message}`);
  failed++;
}

console.log(`\n📊 图片代理测试结果:`);
console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%`);

// 关闭服务器
server.kill('SIGTERM');

// 等待服务器关闭
await setTimeout(1000);

if (failed === 0) {
  console.log('\n🎉 所有图片代理测试通过！');
  process.exit(0);
} else {
  console.log('\n⚠️  部分图片代理测试失败，请检查代码。');
  process.exit(1);
}