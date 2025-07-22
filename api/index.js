import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

// 支持的维基百科语言列表
const SUPPORTED_LANGUAGES = [
  'en', 'ar', 'bn', 'ca', 'cs', 'de', 'eo', 'es', 'eu', 'fa', 'fi', 'fr',
  'el', 'gan', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'ml', 'nl',
  'pl', 'pt', 'ro', 'ru', 'sk', 'sr', 'sv', 'te', 'th', 'tr', 'uk', 'ur',
  'vi', 'wuu', 'zh-yue', 'zh', 'ks'
];

// 中间件配置
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression());

app.use(morgan('combined'));

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://wikitok.littlejoy.live',
    /\.vercel\.app$/,
    /localhost:\d+$/
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP每15分钟最多1000次请求
  message: {
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'wikipedia-proxy-server',
    version: '1.0.0'
  });
});

// 根路径信息
app.get('/', (req, res) => {
  res.json({
    name: 'Wikipedia API代理服务器',
    description: '维基百科API代理服务',
    author: 'shinexyt',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      proxy: '/api/wikipedia/{language}',
      images: '/api/images/{project}/{path}',
      usage: '/usage'
    },
    supported_languages: SUPPORTED_LANGUAGES.length,
    documentation: 'https://github.com/shinexyt/wikipedia-proxy-server'
  });
});

// 使用统计端点
let requestStats = {
  total: 0,
  byLanguage: {},
  errors: 0,
  startTime: new Date().toISOString()
};

app.get('/usage', (req, res) => {
  res.json({
    ...requestStats,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 参数验证函数
function validateWikipediaParams(query) {
  const allowedParams = [
    'action', 'format', 'generator', 'grnnamespace', 'prop', 'inprop',
    'grnlimit', 'exintro', 'exlimit', 'exsentences', 'explaintext',
    'piprop', 'pithumbsize', 'origin', 'variant', 'list', 'srprop',
    'srsearch', 'srnamespace', 'srlimit', 'sroffset', 'titles', 'pageids',
    'redirects', 'converttitles', 'iwurl', 'continue', 'rawcontinue'
  ];

  const filteredParams = {};
  for (const [key, value] of Object.entries(query)) {
    if (allowedParams.includes(key)) {
      filteredParams[key] = value;
    }
  }

  return filteredParams;
}

// 构建维基百科API URL
function buildWikipediaURL(language, params) {
  // 处理特殊的中文语言代码
  let langCode = language;
  if (language === 'zh-yue') {
    langCode = 'zh-yue';
  } else if (language.startsWith('zh-')) {
    langCode = 'zh';
  } else if (language.includes('-')) {
    langCode = language.split('-')[0];
  }

  const baseURL = `https://${langCode}.wikipedia.org/w/api.php`;
  const urlParams = new URLSearchParams(params);

  return `${baseURL}?${urlParams.toString()}`;
}

// 构建Wikimedia图片URL
function buildWikimediaImageURL(project, imagePath) {
  // 支持的项目: commons, en, zh, fr, de, ja, etc.
  const validProjects = ['commons', ...SUPPORTED_LANGUAGES];
  
  if (!validProjects.includes(project)) {
    throw new Error(`不支持的项目: ${project}`);
  }

  // 构建Wikimedia URL
  const baseURL = `https://upload.wikimedia.org/wikipedia/${project}`;
  
  // 确保路径以/开头
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  return `${baseURL}${cleanPath}`;
}

// 检测文件扩展名对应的Content-Type
function getContentTypeFromPath(imagePath) {
  const extension = imagePath.toLowerCase().split('.').pop();
  const contentTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon'
  };
  
  return contentTypes[extension] || 'application/octet-stream';
}

// Wikipedia图片代理端点
app.get('/api/images/:project/*', async (req, res) => {
  const { project } = req.params;
  const imagePath = req.params[0]; // 获取通配符部分
  const startTime = Date.now();

  try {
    // 更新统计
    requestStats.total++;
    requestStats.byLanguage[`images-${project}`] = (requestStats.byLanguage[`images-${project}`] || 0) + 1;

    // 验证项目参数
    const validProjects = ['commons', ...SUPPORTED_LANGUAGES];
    if (!validProjects.includes(project)) {
      return res.status(400).json({
        error: `不支持的图片项目: ${project}`,
        code: 'UNSUPPORTED_PROJECT',
        supported_projects: validProjects
      });
    }

    // 验证图片路径
    if (!imagePath || imagePath.length === 0) {
      return res.status(400).json({
        error: '图片路径不能为空',
        code: 'INVALID_IMAGE_PATH'
      });
    }

    // 构建Wikimedia图片URL
    const imageURL = buildWikimediaImageURL(project, imagePath);
    
    console.log(`图片代理请求: ${project}/${imagePath} -> ${imageURL}`);

    // 发起请求到Wikimedia
    const response = await fetch(imageURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'WikiTok-Proxy/1.0 (https://github.com/shinexyt/wikipedia-proxy-server)',
        'Accept': 'image/*,*/*',
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 15000 // 15秒超时，图片可能较大
    });

    if (!response.ok) {
      throw new Error(`Wikimedia图片响应错误: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || getContentTypeFromPath(imagePath);
    const contentLength = response.headers.get('content-length');
    const lastModified = response.headers.get('last-modified');
    const etag = response.headers.get('etag');
    
    const responseTime = Date.now() - startTime;

    // 设置响应头
    res.set({
      'Content-Type': contentType,
      'X-Proxy-Server': 'wikipedia-proxy-v1.0',
      'X-Response-Time': `${responseTime}ms`,
      'X-Source-Project': project,
      'Cache-Control': 'public, max-age=86400, immutable', // 24小时缓存，图片通常不变
      'Access-Control-Allow-Origin': '*'
    });

    // 如果有内容长度，设置它
    if (contentLength) {
      res.set('Content-Length', contentLength);
    }

    // 如果有Last-Modified和ETag，传递它们以支持条件请求
    if (lastModified) {
      res.set('Last-Modified', lastModified);
    }
    if (etag) {
      res.set('ETag', etag);
    }

    console.log(`图片请求完成: ${project}/${imagePath} (${responseTime}ms, ${contentType})`);

    // 流式传输图片数据
    response.body.pipe(res);

  } catch (error) {
    requestStats.errors++;
    const responseTime = Date.now() - startTime;

    console.error(`图片代理请求失败 [${project}/${imagePath}]:`, error.message);

    res.status(500).json({
      error: '无法获取Wikimedia图片',
      code: 'IMAGE_PROXY_ERROR',
      message: error.message,
      project: project,
      imagePath: imagePath,
      responseTime: `${responseTime}ms`
    });
  }
});

// 主要的代理端点
app.get('/api/wikipedia/:language', async (req, res) => {
  const { language } = req.params;
  const startTime = Date.now();

  try {
    // 更新统计
    requestStats.total++;
    requestStats.byLanguage[language] = (requestStats.byLanguage[language] || 0) + 1;

    // 验证语言代码
    if (!SUPPORTED_LANGUAGES.includes(language) && !language.startsWith('zh-') && !language.includes('-')) {
      return res.status(400).json({
        error: `不支持的语言代码: ${language}`,
        code: 'UNSUPPORTED_LANGUAGE',
        supported_languages: SUPPORTED_LANGUAGES
      });
    }

    // 验证和过滤参数
    const validatedParams = validateWikipediaParams(req.query);

    // 确保有必要的参数
    if (!validatedParams.action) {
      validatedParams.action = 'query';
    }
    if (!validatedParams.format) {
      validatedParams.format = 'json';
    }

    // 强制设置origin参数以避免CORS问题
    validatedParams.origin = '*';

    // 构建目标URL
    const targetURL = buildWikipediaURL(language, validatedParams);

    console.log(`代理请求: ${language} -> ${targetURL}`);

    // 发起请求到维基百科
    const response = await fetch(targetURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'WikiTok-Proxy/1.0 (https://github.com/shinexyt/wikipedia-proxy-server)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 10000 // 10秒超时
    });

    if (!response.ok) {
      throw new Error(`维基百科API响应错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // 添加代理信息到响应头
    res.set({
      'X-Proxy-Server': 'wikipedia-proxy-v1.0',
      'X-Response-Time': `${responseTime}ms`,
      'X-Source-Language': language,
      'Cache-Control': 'public, max-age=300' // 5分钟缓存
    });

    console.log(`请求完成: ${language} (${responseTime}ms)`);

    res.json(data);

  } catch (error) {
    requestStats.errors++;
    const responseTime = Date.now() - startTime;

    console.error(`代理请求失败 [${language}]:`, error.message);

    res.status(500).json({
      error: '无法获取维基百科数据',
      code: 'PROXY_ERROR',
      message: error.message,
      language: language,
      responseTime: `${responseTime}ms`
    });
  }
});

// 处理OPTIONS请求（预检请求）
app.options('/api/wikipedia/:language', (req, res) => {
  res.status(200).end();
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '端点不存在',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    available_endpoints: ['/health', '/usage', '/api/wikipedia/{language}', '/api/images/{project}/{path}']
  });
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    error: '服务器内部错误',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
  });
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

// 启动服务器（仅在非Vercel环境下）
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 维基百科代理服务器已启动`);
    console.log(`📡 监听端口: ${PORT}`);
    console.log(`🌍 支持语言: ${SUPPORTED_LANGUAGES.length}种`);
    console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
    console.log(`📊 使用统计: http://localhost:${PORT}/usage`);
    console.log(`🔧 代理端点: http://localhost:${PORT}/api/wikipedia/{language}`);
    console.log(`🖼️  图片端点: http://localhost:${PORT}/api/images/{project}/{path}`);
  });
}

// Vercel无服务器函数导出
export default app;
