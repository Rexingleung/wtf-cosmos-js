/**
 * WTF Cosmos JS - Helper Functions
 * 辅助功能函数
 */

const crypto = require('crypto');
const { bech32 } = require('bech32');
const config = require('../config');

/**
 * 生成随机 ID
 * @param {number} length - ID 长度
 * @returns {string} 随机 ID
 */
function generateRandomId(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
function generateRandomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * SHA256 哈希
 * @param {string} data - 要哈希的数据
 * @returns {string} 哈希值
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 验证地址格式
 * @param {string} address - 地址
 * @returns {boolean} 是否有效
 */
function isValidAddress(address) {
  try {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // 检查是否以正确的前缀开始
    if (!address.startsWith(config.NETWORK.PREFIX)) {
      return false;
    }
    
    // 使用 bech32 验证
    const decoded = bech32.decode(address);
    return decoded.prefix === config.NETWORK.PREFIX;
  } catch (error) {
    return false;
  }
}

/**
 * 格式化金额
 * @param {number} amount - 金额
 * @param {number} decimals - 小数点位数
 * @returns {string} 格式化后的金额
 */
function formatAmount(amount, decimals = config.NETWORK.DECIMALS) {
  const divisor = Math.pow(10, decimals);
  return (amount / divisor).toFixed(decimals);
}

/**
 * 解析金额
 * @param {string} amount - 金额字符串
 * @param {number} decimals - 小数点位数
 * @returns {number} 解析后的金额
 */
function parseAmount(amount, decimals = config.NETWORK.DECIMALS) {
  const multiplier = Math.pow(10, decimals);
  return Math.floor(parseFloat(amount) * multiplier);
}

/**
 * 验证私钥格式
 * @param {string} privateKey - 私钥
 * @returns {boolean} 是否有效
 */
function isValidPrivateKey(privateKey) {
  try {
    if (!privateKey || typeof privateKey !== 'string') {
      return false;
    }
    
    // 移除 0x 前缀
    const cleanKey = privateKey.replace(/^0x/, '');
    
    // 检查是否为 64 个十六进制字符
    return /^[a-fA-F0-9]{64}$/.test(cleanKey);
  } catch (error) {
    return false;
  }
}

/**
 * 生成交易 ID
 * @returns {string} 交易 ID
 */
function generateTransactionId() {
  return 'tx_' + generateRandomId(16);
}

/**
 * 生成区块 ID
 * @returns {string} 区块 ID
 */
function generateBlockId() {
  return 'block_' + generateRandomId(16);
}

/**
 * 计算数组的平均值
 * @param {number[]} numbers - 数字数组
 * @returns {number} 平均值
 */
function calculateAverage(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return 0;
  }
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
}

/**
 * 时间格式化
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化的时间
 */
function formatTimestamp(timestamp) {
  return new Date(timestamp).toISOString();
}

/**
 * 获取当前时间戳
 * @returns {number} 时间戳
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 等待指定时间
 * @param {number} ms - 毫秒
 * @returns {Promise} Promise
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 验证数值范围
 * @param {number} value - 值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} 是否在范围内
 */
function isInRange(value, min, max) {
  return value >= min && value <= max;
}

/**
 * 深度克隆对象
 * @param {object} obj - 要克隆的对象
 * @returns {object} 克隆的对象
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  generateRandomId,
  generateRandomString,
  sha256,
  isValidAddress,
  formatAmount,
  parseAmount,
  isValidPrivateKey,
  generateTransactionId,
  generateBlockId,
  calculateAverage,
  formatTimestamp,
  getCurrentTimestamp,
  sleep,
  isInRange,
  deepClone,
};