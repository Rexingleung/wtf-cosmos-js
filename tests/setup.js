/**
 * WTF Cosmos JS - Test Setup
 * 测试环境配置
 */

// 设置测试环境
process.env.NODE_ENV = 'test';

// 全局测试配置
global.console = {
  ...console,
  // 在测试中禁用一些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};