# Wikipedia API 代理服务器

> 为WikiTok应用提供维基百科API代理服务，支持中国内陆访问

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fshinexyt%2Fwikipedia-proxy-server)

## 🚀 快速部署

### 一键部署到Vercel

点击上面的"Deploy with Vercel"按钮，或者：

1. **Fork这个仓库**
2. **在Vercel中连接GitHub仓库**
3. **自动部署完成**

### 手动部署

```bash
# 克隆项目
git clone https://github.com/shinexyt/wikipedia-proxy-server.git
cd wikipedia-proxy-server

# 安装依赖
npm install

# 部署前检查
npm run deploy-check

# 使用Vercel CLI部署
npx vercel --prod
```

## 📖 使用方法

部署后，你可以通过以下端点访问：

- **健康检查**: `https://your-app.vercel.app/health`
- **API代理**: `https://your-app.vercel.app/api/wikipedia/{language}`
- **使用统计**: `https://your-app.vercel.app/usage`

### API示例

```bash
# 获取英文随机文章
curl "https://your-app.vercel.app/api/wikipedia/en?action=query&format=json&generator=random&grnnamespace=0&prop=extracts|info|pageimages&grnlimit=5"

# 获取中文随机文章  
curl "https://your-app.vercel.app/api/wikipedia/zh?action=query&format=json&generator=random&grnnamespace=0&prop=extracts|info|pageimages&grnlimit=5"
```

## 🌍 支持语言

支持41种语言，包括：
- 🇺🇸 English (en)
- 🇨🇳 中文 (zh)
- 🇫🇷 Français (fr)
- 🇩🇪 Deutsch (de)
- 🇯🇵 日本語 (ja)
- 🇰🇷 한국어 (ko)
- 🇪🇸 Español (es)
- 等等...

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 部署前检查
npm run deploy-check
```

## 📋 技术特性

- ✅ **无服务器架构** - 基于Vercel Functions
- ✅ **CORS支持** - 支持跨域请求
- ✅ **缓存优化** - 5分钟API响应缓存
- ✅ **压缩传输** - gzip压缩
- ✅ **安全头部** - helmet安全配置
- ✅ **速率限制** - 防止API滥用
- ✅ **错误处理** - 完善的错误处理机制

## 📁 项目结构

```
wikipedia-proxy/
├── api/
│   └── index.js        # Vercel无服务器函数入口
├── public/
│   └── index.html      # 静态首页和API文档
├── index.js            # 本地开发服务器
├── package.json        # 项目配置和依赖
├── vercel.json         # Vercel部署配置
├── deploy-check.js     # 部署前检查脚本
├── vercel-check.js     # Vercel配置验证脚本
└── DEPLOYMENT.md       # 详细部署指南
```

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关项目

- [WikiTok - TikTok风格的维基百科浏览器](https://github.com/IsaacGemal/wikitok)

---

如有问题，请查看 [部署指南](DEPLOYMENT.md) 或提交 Issue。
