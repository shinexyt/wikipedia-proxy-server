import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 开始测试维基百科代理服务器...\n');

// 启动服务器
const server = spawn('node', ['index.js'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: '3333' }
});

server.stdout.on('data', (data) => {
  console.log(`[服务器] ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`[服务器错误] ${data}`);
});

// 等待服务器启动
await setTimeout(2000);

const BASE_URL = 'http://localhost:3333';

// 测试用例
const tests = [
  {
    name: '健康检查',
    url: `${BASE_URL}/health`,
    expect: (data) => data.status === 'healthy'
  },
  {
    name: '服务信息',
    url: `${BASE_URL}/`,
    expect: (data) => data.name && data.version
  },
  {
    name: '使用统计',
    url: `${BASE_URL}/usage`,
    expect: (data) => typeof data.total === 'number'
  },
  {
    name: '英文随机文章',
    url: `${BASE_URL}/api/wikipedia/en?action=query&format=json&generator=random&grnnamespace=0&prop=extracts|info|pageimages&grnlimit=5`,
    expect: (data) => data.query && data.query.pages
  },
  {
    name: '中文随机文章',
    url: `${BASE_URL}/api/wikipedia/zh?action=query&format=json&generator=random&grnnamespace=0&prop=extracts|info|pageimages&grnlimit=5`,
    expect: (data) => data.query && data.query.pages
  },
  {
    name: '法语随机文章',
    url: `${BASE_URL}/api/wikipedia/fr?action=query&format=json&generator=random&grnnamespace=0&prop=extracts|info|pageimages&grnlimit=3`,
    expect: (data) => data.query && data.query.pages
  },
  {
    name: '不支持的语言',
    url: `${BASE_URL}/api/wikipedia/invalid?action=query&format=json`,
    expect: (data) => data.error && data.code === 'UNSUPPORTED_LANGUAGE',
    expectStatus: 400
  },
  {
    name: '404测试',
    url: `${BASE_URL}/nonexistent`,
    expect: (data) => data.code === 'NOT_FOUND',
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
  await setTimeout(500);
}

console.log(`\n📊 测试结果:`);
console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%`);

// 关闭服务器
server.kill('SIGTERM');

// 等待服务器关闭
await setTimeout(1000);

if (failed === 0) {
  console.log('\n🎉 所有测试通过！服务器可以正常部署。');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查代码。');
  process.exit(1);
}
