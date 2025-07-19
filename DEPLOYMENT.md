# Vercel 部署指南

## 部署步骤

### 1. 确保项目配置正确

项目已经包含了以下Vercel部署所需的配置文件：

- `vercel.json` - Vercel配置文件
- `package.json` - 包含正确的依赖和脚本
- `.gitignore` - 排除不必要的文件

### 2. 使用Vercel CLI部署

```bash
# 安装Vercel CLI（如果还没有安装）
npm i -g vercel

# 登录Vercel
vercel login

# 在项目目录中运行部署
vercel

# 部署到生产环境
vercel --prod
```

### 3. 使用GitHub集成部署

1. 将代码推送到GitHub仓库
2. 在Vercel Dashboard中连接GitHub仓库
3. 选择这个项目仓库
4. Vercel会自动检测配置并部署

### 4. 环境变量配置

在Vercel Dashboard中，你可以设置以下环境变量：

- `NODE_ENV=production` (已在vercel.json中设置)

### 5. 部署后测试

部署完成后，你可以通过以下端点测试：

- 健康检查: `https://your-deployment.vercel.app/health`
- 服务信息: `https://your-deployment.vercel.app/`
- API代理: `https://your-deployment.vercel.app/api/wikipedia/en?action=query&format=json&titles=Test`

## 常见问题解决

### 1. 模块导入问题
- 确保package.json中设置了`"type": "module"`
- 使用ES6模块语法 (`import/export`)

### 2. 函数超时
- 已将函数超时时间设置为30秒 (`maxDuration: 30`)
- 如需更长时间，可以升级Vercel套餐

### 3. CORS问题
- 已在代码和vercel.json中配置了CORS头部
- API支持跨域请求

### 4. 依赖问题
- 确保所有依赖都在package.json的dependencies中
- 运行`npm install`确保依赖正确安装

## 性能优化

1. **缓存设置**: API响应已设置5分钟缓存
2. **压缩**: 启用了gzip压缩
3. **安全头部**: 使用helmet设置安全头部
4. **速率限制**: 防止API滥用

## 监控和调试

- 在Vercel Dashboard中查看函数日志
- 使用`/usage`端点查看API使用统计
- 通过`/health`端点监控服务状态

如果遇到部署问题，请检查Vercel的函数日志或联系技术支持。
