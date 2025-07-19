# Wikipedia API 代理服务器

维基百科 API 代理服务

## 🚀 功能特性

- ✅ 支持所有维基百科语言版本（45+ 种语言）
- ✅ 完整的 CORS 支持
- ✅ 速率限制保护
- ✅ 请求参数验证
- ✅ 错误处理和日志记录
- ✅ 响应压缩
- ✅ 健康检查端点
- ✅ 使用统计监控

## 📋 支持的语言

支持所有主要语言，包括：
- 中文（简体/繁体）
- 英语、法语、德语、西班牙语
- 日语、韩语、阿拉伯语
- 以及其他 40+ 种语言

## 🛠 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **部署**: Vercel/Railway/Render
- **安全**: Helmet, CORS, Rate Limiting

## 📦 安装和运行

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd wikipedia-proxy

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动生产服务器
npm start
```

### 环境变量

```bash
PORT=3001  # 可选，默认 3001
NODE_ENV=production  # 生产环境
```

## 🌐 API 端点

### 主要代理端点
```
GET /api/wikipedia/{language}?[params]
```

**参数说明：**
- `{language}`: 维基百科语言代码（如 `en`, `zh`, `fr`）
- `[params]`: 维基百科 API 参数

**示例请求：**
```bash
# 获取英文随机文章
curl "http://localhost:3001/api/wikipedia/en?action=query&format=json&generator=random&grnnamespace=0&prop=extracts|info|pageimages"

# 获取中文随机文章
curl "http://localhost:3001/api/wikipedia/zh?action=query&format=json&generator=random&grnnamespace=0&prop=extracts|info|pageimages"
```

### 其他端点

```bash
# 健康检查
GET /health

# 使用统计
GET /usage

# 服务信息
GET /
```

## 🚀 部署到 Vercel

1. 在项目根目录创建 `vercel.json`
2. 连接 GitHub 仓库到 Vercel
3. 自动部署

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.js"
    }
  ]
}
```

## 📊 监控和维护

### 健康检查
```bash
curl https://your-proxy.vercel.app/health
```

### 使用统计
```bash
curl https://your-proxy.vercel.app/usage
```

### 日志监控
- 所有请求都会记录到控制台
- 包含响应时间和错误信息
- 支持生产环境日志聚合

## 🛡 安全特性

- **速率限制**: 每 IP 每 15 分钟最多 1000 次请求
- **参数过滤**: 只允许安全的维基百科 API 参数
- **CORS 控制**: 限制允许的域名
- **错误处理**: 不泄露敏感信息

## 🔍 故障排除

### 常见问题

1. **CORS 错误**
   - 检查前端域名是否在 CORS 白名单中
   - 确保请求头正确设置

2. **速率限制**
   - 减少请求频率
   - 实现客户端缓存

3. **超时错误**
   - 检查网络连接
   - 维基百科服务是否正常

### 错误代码

- `RATE_LIMIT_EXCEEDED`: 请求过于频繁
- `UNSUPPORTED_LANGUAGE`: 不支持的语言代码
- `PROXY_ERROR`: 代理请求失败
- `NOT_FOUND`: 端点不存在

## 📄 许可证

MIT License

## 👨‍💻 作者

shinexyt

---

**注意**: 此代理服务器仅用于教育和研究目的，请遵守维基百科的使用条款和当地法律法规。
