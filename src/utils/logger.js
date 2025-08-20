/**
 * WTF Cosmos JS - Logger Module
 * 基于 Winston 的日志记录模块
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// 创建日志轮转配置
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

const errorRotateFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat
});

// 创建 Winston Logger 实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'wtf-cosmos-js',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),
    
    // 所有日志文件
    dailyRotateFileTransport,
    
    // 错误日志文件
    errorRotateFileTransport
  ],
  
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      format: logFormat
    })
  ]
});

// 监听轮转事件
dailyRotateFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info(`Log file rotated from ${oldFilename} to ${newFilename}`);
});

// 监听错误事件
dailyRotateFileTransport.on('error', (error) => {
  console.error('Log rotation error:', error);
});

// 添加一些便捷方法
logger.blockchain = (message, data = {}) => {
  logger.info(message, { ...data, component: 'blockchain' });
};

logger.consensus = (message, data = {}) => {
  logger.info(message, { ...data, component: 'consensus' });
};

logger.api = (message, data = {}) => {
  logger.info(message, { ...data, component: 'api' });
};

logger.crypto = (message, data = {}) => {
  logger.info(message, { ...data, component: 'crypto' });
};

logger.performance = (message, data = {}) => {
  logger.info(message, { ...data, component: 'performance' });
};

// HTTP 请求日志中间件
logger.httpMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      component: 'http'
    };
    
    if (res.statusCode >= 400) {
      logger.warn(`HTTP ${res.statusCode} ${req.method} ${req.url}`, logData);
    } else {
      logger.info(`HTTP ${res.statusCode} ${req.method} ${req.url}`, logData);
    }
  });
  
  next();
};

// 导出 logger 实例
module.exports = {
  logger,
  logFormat,
  logDir
};