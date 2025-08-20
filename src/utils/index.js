/**
 * WTF Cosmos JS - Utils Index
 * 工具模块导出
 */

const { logger } = require('./logger');
const helpers = require('./helpers');

module.exports = {
  logger,
  ...helpers,
};