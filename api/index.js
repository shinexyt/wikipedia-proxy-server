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
    available_endpoints: ['/health', '/usage', '/api/wikipedia/{language}']
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
  });
}

// Vercel无服务器函数导出
export default app;
