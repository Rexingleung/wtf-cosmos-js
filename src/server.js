/**
 * WTF Cosmos JS - Server
 * 服务器主文件
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { logger } = require('./utils/logger');
const config = require('./config');
const { Blockchain } = require('./blockchain');
const Wallet = require('./crypto/Wallet');

// API 路由
const blockchainRoutes = require('./api/blockchain');
const walletsRoutes = require('./api/wallets');
const transactionsRoutes = require('./api/transactions');
const miningRoutes = require('./api/mining');
const validatorsRoutes = require('./api/validators');
const governanceRoutes = require('./api/governance');

/**
 * 创建服务器
 * @returns {Express} Express 应用
 */
async function createServer() {
  const app = express();
  
  // 安全中间件
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }));
  
  // CORS 配置
  app.use(cors({
    origin: config.NODE_ENV === 'production' ? false : true,
    credentials: true,
  }));
  
  // 请求解析
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
  
  // 日志中间件
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));
  }
  
  // 静态文件服务
  app.use(express.static(path.join(__dirname, '../public')));
  
  // 初始化区块链
  const blockchain = new Blockchain();
  const wallets = new Map(); // 钱包存储
  
  // 将区块链和钱包挂载到 app 上
  app.locals.blockchain = blockchain;
  app.locals.wallets = wallets;
  
  // 健康检查端点
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      version: '1.0.0',
      network: config.NETWORK.CHAIN_NAME,
      chainId: config.NETWORK.CHAIN_ID
    });
  });
  
  // 主页
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
  
  // API 路由
  app.use('/api/blockchain', blockchainRoutes);
  app.use('/api/wallets', walletsRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/mining', miningRoutes);
  app.use('/api/validators', validatorsRoutes);
  app.use('/api/governance', governanceRoutes);
  
  // API 信息端点
  app.get('/api', (req, res) => {
    res.json({
      name: 'WTF Cosmos JS API',
      version: '1.0.0',
      description: '一个基于 CosmJS 的增强型区块链实现',
      endpoints: {
        blockchain: '/api/blockchain',
        wallets: '/api/wallets',
        transactions: '/api/transactions',
        mining: '/api/mining',
        validators: '/api/validators',
        governance: '/api/governance'
      },
      network: {
        chainId: config.NETWORK.CHAIN_ID,
        chainName: config.NETWORK.CHAIN_NAME,
        denom: config.NETWORK.DENOM,
        prefix: config.NETWORK.PREFIX
      }
    });
  });
  
  // 404 处理
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: '请求的资源不存在',
      path: req.originalUrl
    });
  });
  
  // 错误处理中间件
  app.use((error, req, res, next) => {
    logger.error('Server error:', error);
    
    res.status(error.status || 500).json({
      error: error.name || 'Internal Server Error',
      message: error.message || '服务器内部错误',
      ...(config.NODE_ENV === 'development' && { stack: error.stack })
    });
  });
  
  logger.info('服务器初始化完成');
  return app;
}

module.exports = { createServer };