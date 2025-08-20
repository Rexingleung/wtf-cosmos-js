/**
 * WTF Cosmos JS - Key Manager
 * 密钥管理器
 */

const crypto = require('crypto');
const { generateRandomId, sha256 } = require('../utils/helpers');
const { logger } = require('../utils/logger');

class KeyManager {
  constructor() {
    this.keys = new Map();
    this.keyDerivationFunction = 'pbkdf2';
    this.iterations = 100000;
    this.keyLength = 32;
    this.digest = 'sha256';
  }

  /**
   * 生成随机密钥
   * @param {number} length - 密钥长度
   * @returns {string} 密钥
   */
  generateKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 从密码派生密钥
   * @param {string} password - 密码
   * @param {string} salt - 盐值
   * @returns {string} 派生密钥
   */
  deriveKey(password, salt = null) {
    if (!salt) {
      salt = generateRandomId(16);
    }
    
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      this.iterations,
      this.keyLength,
      this.digest
    );
    
    return {
      key: key.toString('hex'),
      salt: salt
    };
  }

  /**
   * 加密数据
   * @param {string} data - 要加密的数据
   * @param {string} key - 加密密钥
   * @returns {object} 加密结果
   */
  encrypt(data, key) {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm
      };
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('加密失败');
    }
  }

  /**
   * 解密数据
   * @param {object} encryptedData - 加密数据
   * @param {string} key - 解密密钥
   * @returns {string} 解密后的数据
   */
  decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, authTag, algorithm } = encryptedData;
      const decipher = crypto.createDecipher(algorithm, key);
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('解密失败');
    }
  }

  /**
   * 存储密钥
   * @param {string} keyId - 密钥 ID
   * @param {string} key - 密钥
   * @param {object} metadata - 元数据
   */
  storeKey(keyId, key, metadata = {}) {
    this.keys.set(keyId, {
      key,
      metadata,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: null
    });
    
    logger.info(`Key stored: ${keyId}`);
  }

  /**
   * 获取密钥
   * @param {string} keyId - 密钥 ID
   * @returns {string|null} 密钥
   */
  getKey(keyId) {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      return null;
    }
    
    // 更新访问统计
    keyData.accessCount++;
    keyData.lastAccessed = Date.now();
    
    return keyData.key;
  }

  /**
   * 删除密钥
   * @param {string} keyId - 密钥 ID
   * @returns {boolean} 是否成功
   */
  deleteKey(keyId) {
    const deleted = this.keys.delete(keyId);
    if (deleted) {
      logger.info(`Key deleted: ${keyId}`);
    }
    return deleted;
  }

  /**
   * 获取所有密钥 ID
   * @returns {string[]} 密钥 ID 列表
   */
  getKeyIds() {
    return Array.from(this.keys.keys());
  }

  /**
   * 获取密钥统计信息
   * @param {string} keyId - 密钥 ID
   * @returns {object|null} 统计信息
   */
  getKeyStats(keyId) {
    const keyData = this.keys.get(keyId);
    if (!keyData) {
      return null;
    }
    
    return {
      keyId,
      createdAt: keyData.createdAt,
      accessCount: keyData.accessCount,
      lastAccessed: keyData.lastAccessed,
      metadata: keyData.metadata
    };
  }

  /**
   * 清理过期密钥
   * @param {number} maxAge - 最大存活时间 (毫秒)
   * @returns {number} 清理的密钥数量
   */
  cleanupExpiredKeys(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [keyId, keyData] of this.keys.entries()) {
      if (now - keyData.createdAt > maxAge) {
        this.keys.delete(keyId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired keys`);
    }
    
    return cleanedCount;
  }

  /**
   * 获取管理器统计
   * @returns {object} 统计信息
   */
  getStats() {
    return {
      totalKeys: this.keys.size,
      keyDerivationFunction: this.keyDerivationFunction,
      iterations: this.iterations,
      keyLength: this.keyLength,
      digest: this.digest
    };
  }
}

module.exports = KeyManager;