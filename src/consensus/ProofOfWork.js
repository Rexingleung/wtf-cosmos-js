/**
 * WTF Cosmos JS - Proof of Work
 * 工作量证明共识机制
 */

const { logger } = require('../utils/logger');
const { getCurrentTimestamp } = require('../utils/helpers');
const config = require('../config');

class ProofOfWork {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.difficulty = config.BLOCKCHAIN.DIFFICULTY;
    this.miningStats = {
      totalHashesComputed: 0,
      totalBlocksMined: 0,
      totalMiningTime: 0,
      averageHashRate: 0
    };
  }

  /**
   * 挖矿
   * @param {Block} block - 要挖的区块
   * @param {number} difficulty - 挖矿难度
   * @returns {Promise<boolean>} 挖矿结果
   */
  async mineBlock(block, difficulty = this.difficulty) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const target = Array(difficulty + 1).join('0');
      
      logger.info(`开始PoW挖矿: 区块=${block.id}, 难度=${difficulty}`);
      
      // 异步挖矿，避免阻塞
      const mineAsync = () => {
        const batchSize = 10000; // 每批处理的哈希数量
        let batchStart = Date.now();
        
        for (let i = 0; i < batchSize; i++) {
          block.nonce++;
          block.hash = block.calculateHash();
          this.miningStats.totalHashesComputed++;
          
          if (block.hash.substring(0, difficulty) === target) {
            const endTime = Date.now();
            const miningTime = endTime - startTime;
            
            this.updateMiningStats(miningTime);
            
            logger.info(`PoW挖矿成功: 哈希=${block.hash}, nonce=${block.nonce}`);
            logger.info(`挖矿用时: ${miningTime}ms, 算力: ${(block.nonce / (miningTime / 1000)).toFixed(0)} H/s`);
            
            resolve(true);
            return;
          }
        }
        
        // 定期输出进度
        const batchTime = Date.now() - batchStart;
        if (block.nonce % 100000 === 0) {
          const elapsed = Date.now() - startTime;
          const hashRate = block.nonce / (elapsed / 1000);
          logger.debug(`挖矿进度: nonce=${block.nonce}, 算力=${hashRate.toFixed(0)} H/s`);
        }
        
        // 继续下一批
        setImmediate(mineAsync);
      };
      
      mineAsync();
    });
  }

  /**
   * 验证工作量证明
   * @param {Block} block - 要验证的区块
   * @param {number} difficulty - 难度
   * @returns {boolean} 验证结果
   */
  verifyProofOfWork(block, difficulty = this.difficulty) {
    try {
      const target = Array(difficulty + 1).join('0');
      const hash = block.calculateHash();
      
      // 验证哈希是否匹配
      if (hash !== block.hash) {
        logger.warn(`区块哈希不匹配: ${block.id}`);
        return false;
      }
      
      // 验证工作量证明
      if (block.hash.substring(0, difficulty) !== target) {
        logger.warn(`工作量证明无效: ${block.id}`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('验证工作量证明失败:', error);
      return false;
    }
  }

  /**
   * 计算挖矿难度
   * @param {Array} recentBlocks - 最近的区块
   * @returns {number} 新的难度
   */
  calculateDifficulty(recentBlocks) {
    if (recentBlocks.length < 2) {
      return this.difficulty;
    }
    
    const targetTime = config.BLOCKCHAIN.BLOCK_TIME;
    const adjustmentPeriod = 10; // 每10个区块调整一次难度
    
    if (recentBlocks.length >= adjustmentPeriod) {
      const firstBlock = recentBlocks[recentBlocks.length - adjustmentPeriod];
      const lastBlock = recentBlocks[recentBlocks.length - 1];
      
      const actualTime = (lastBlock.timestamp - firstBlock.timestamp) / (adjustmentPeriod - 1);
      const ratio = actualTime / targetTime;
      
      let newDifficulty = this.difficulty;
      
      // 如果出块时间太快，增加难度
      if (ratio < 0.5) {
        newDifficulty = Math.min(this.difficulty + 1, 10); // 最大难度限制
      }
      // 如果出块时间太慢，降低难度
      else if (ratio > 2.0) {
        newDifficulty = Math.max(this.difficulty - 1, 1); // 最小难度限制
      }
      
      if (newDifficulty !== this.difficulty) {
        logger.info(`难度调整: ${this.difficulty} -> ${newDifficulty} (比率: ${ratio.toFixed(2)})`);
        this.difficulty = newDifficulty;
      }
      
      return newDifficulty;
    }
    
    return this.difficulty;
  }

  /**
   * 更新挖矿统计
   * @param {number} miningTime - 挖矿时间
   */
  updateMiningStats(miningTime) {
    this.miningStats.totalBlocksMined++;
    this.miningStats.totalMiningTime += miningTime;
    
    if (this.miningStats.totalMiningTime > 0) {
      this.miningStats.averageHashRate = 
        this.miningStats.totalHashesComputed / (this.miningStats.totalMiningTime / 1000);
    }
  }

  /**
   * 获取挖矿统计
   * @returns {object} 挖矿统计信息
   */
  getMiningStats() {
    return {
      ...this.miningStats,
      currentDifficulty: this.difficulty,
      averageMiningTime: this.miningStats.totalBlocksMined > 0 ? 
        this.miningStats.totalMiningTime / this.miningStats.totalBlocksMined : 0
    };
  }

  /**
   * 重置挖矿统计
   */
  resetMiningStats() {
    this.miningStats = {
      totalHashesComputed: 0,
      totalBlocksMined: 0,
      totalMiningTime: 0,
      averageHashRate: 0
    };
    
    logger.info('挖矿统计已重置');
  }

  /**
   * 估算挖矿时间
   * @param {number} difficulty - 难度
   * @param {number} hashRate - 算力 (H/s)
   * @returns {number} 估计时间 (毫秒)
   */
  estimateMiningTime(difficulty = this.difficulty, hashRate = this.miningStats.averageHashRate) {
    if (hashRate === 0) {
      return 0;
    }
    
    // 2^difficulty 的期望尝试次数
    const expectedAttempts = Math.pow(2, difficulty * 4); // 每个十六进制位代表4位二进制
    return (expectedAttempts / hashRate) * 1000; // 转换为毫秒
  }

  /**
   * 检查是否应该停止挖矿
   * @param {number} startTime - 开始时间
   * @param {number} maxTime - 最大挖矿时间 (毫秒)
   * @returns {boolean} 是否应该停止
   */
  shouldStopMining(startTime, maxTime = 30000) { // 默认30秒超时
    return Date.now() - startTime > maxTime;
  }
}

module.exports = ProofOfWork;