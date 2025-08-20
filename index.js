#!/usr/bin/env node

/**
 * WTF Cosmos JS - Main Entry Point
 * 主入口文件
 */

const { startServer } = require('./src/server');
const { logger } = require('./src/utils/logger');

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', { reason, promise });
  process.exit(1);
});

// 启动服务器
if (require.main === module) {
  console.log('🚀 启动 WTF Cosmos JS...');
  startServer();
}

module.exports = require('./src');
