#!/usr/bin/env node

/**
 * WTF Cosmos JS - Entry Point
 * 一个基于 CosmJS 的增强型区块链实现
 */

const { createServer } = require('./src/server');
const { logger } = require('./src/utils/logger');
const config = require('./src/config');

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 启动应用
async function start() {
  try {
    const app = await createServer();
    const PORT = config.PORT || 3000;
    
    app.listen(PORT, () => {
      logger.info(`🚀 WTF Cosmos JS Server running on port ${PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${PORT}`);
      logger.info(`🔗 API: http://localhost:${PORT}/api`);
      logger.info(`📖 Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();