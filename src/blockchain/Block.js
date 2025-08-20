/**
 * WTF Cosmos JS - Block
 * 区块类
 */

const { sha256, generateBlockId, getCurrentTimestamp } = require('../utils/helpers');
const { logger } = require('../utils/logger');
const config = require('../config');

class Block {
  constructor(timestamp, transactions, previousHash = '', validator = null) {
    this.id = generateBlockId();
    this.timestamp = timestamp || getCurrentTimestamp();
    this.transactions = transactions || [];
    this.previousHash = previousHash;
    this.hash = '';
    this.nonce = 0;
    this.difficulty = config.BLOCKCHAIN.DIFFICULTY;
    this.validator = validator; // 出块验证者
    this.height = 0; // 区块高度
    this.gasUsed = 0; // 使用的 Gas
    this.gasLimit = 10000000; // Gas 限制
    this.transactionCount = transactions ? transactions.length : 0;
    this.merkleRoot = this.calculateMerkleRoot();
    this.signature = ''; // 验证者签名
  }

  /**
   * 计算区块哈希值
   * @returns {string} 哈希值
   */
  calculateHash() {
    const blockData = {
      id: this.id,
      timestamp: this.timestamp,
      previousHash: this.previousHash,
      merkleRoot: this.merkleRoot,
      validator: this.validator,
      height: this.height,
      nonce: this.nonce,
      difficulty: this.difficulty
    };
    
    return sha256(JSON.stringify(blockData));
  }

  /**
   * 计算默克尔树根
   * @returns {string} 默克尔树根
   */
  calculateMerkleRoot() {
    if (!this.transactions || this.transactions.length === 0) {
      return sha256('empty');
    }
    
    // 简化版本的默克尔树计算
    const hashes = this.transactions.map(tx => {
      return typeof tx === 'object' ? (tx.hash || tx.calculateHash()) : tx;
    });
    
    while (hashes.length > 1) {
      const newHashes = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || hashes[i];
        newHashes.push(sha256(left + right));
      }
      hashes.splice(0, hashes.length, ...newHashes);
    }
    
    return hashes[0];
  }

  /**
   * 挖矿 (工作量证明)
   * @param {number} difficulty - 挖矿难度
   */
  mineBlock(difficulty = this.difficulty) {
    const target = Array(difficulty + 1).join('0');
    const startTime = Date.now();
    
    logger.info(`开始挖矿区块 ${this.id}, 难度: ${difficulty}`);
    
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
      
      // 每 100000 次尝试输出一次进度
      if (this.nonce % 100000 === 0) {
        const elapsed = Date.now() - startTime;
        const hashRate = this.nonce / (elapsed / 1000);
        logger.debug(`挖矿进度: nonce=${this.nonce}, 算力=${hashRate.toFixed(0)} H/s`);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const hashRate = this.nonce / (duration / 1000);
    
    logger.info(`区块挖出: ${this.hash}`);
    logger.info(`挖矿统计: nonce=${this.nonce}, 时间=${duration}ms, 算力=${hashRate.toFixed(0)} H/s`);
  }

  /**
   * 验证区块有效性
   * @returns {boolean} 是否有效
   */
  isValid() {
    try {
      // 检查区块哈希
      const calculatedHash = this.calculateHash();
      if (calculatedHash !== this.hash) {
        logger.warn(`Invalid block hash: ${this.id}`);
        return false;
      }
      
      // 检查工作量证明
      const target = Array(this.difficulty + 1).join('0');
      if (this.hash.substring(0, this.difficulty) !== target) {
        logger.warn(`Invalid proof of work: ${this.id}`);
        return false;
      }
      
      // 检查默克尔树根
      const calculatedMerkleRoot = this.calculateMerkleRoot();
      if (calculatedMerkleRoot !== this.merkleRoot) {
        logger.warn(`Invalid merkle root: ${this.id}`);
        return false;
      }
      
      // 检查交易数量限制
      if (this.transactions.length > config.BLOCKCHAIN.MAX_TRANSACTIONS_PER_BLOCK) {
        logger.warn(`Too many transactions in block: ${this.id}`);
        return false;
      }
      
      // 验证所有交易
      for (const transaction of this.transactions) {
        if (!transaction.isValid || !transaction.isValid()) {
          logger.warn(`Invalid transaction in block: ${this.id}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error validating block:', error);
      return false;
    }
  }

  /**
   * 添加交易
   * @param {Transaction} transaction - 交易
   * @returns {boolean} 是否成功
   */
  addTransaction(transaction) {
    try {
      // 检查交易数量限制
      if (this.transactions.length >= config.BLOCKCHAIN.MAX_TRANSACTIONS_PER_BLOCK) {
        logger.warn('Block is full, cannot add more transactions');
        return false;
      }
      
      // 验证交易
      if (!transaction.isValid()) {
        logger.warn('Cannot add invalid transaction to block');
        return false;
      }
      
      // 检查是否重复
      const existingTx = this.transactions.find(tx => tx.id === transaction.id);
      if (existingTx) {
        logger.warn('Transaction already exists in block');
        return false;
      }
      
      this.transactions.push(transaction);
      this.transactionCount = this.transactions.length;
      this.gasUsed += transaction.fee; // 简化版本
      
      // 重新计算默克尔树根
      this.merkleRoot = this.calculateMerkleRoot();
      
      logger.debug(`Transaction added to block: ${transaction.id}`);
      return true;
    } catch (error) {
      logger.error('Error adding transaction to block:', error);
      return false;
    }
  }

  /**
   * 移除交易
   * @param {string} transactionId - 交易 ID
   * @returns {boolean} 是否成功
   */
  removeTransaction(transactionId) {
    const index = this.transactions.findIndex(tx => tx.id === transactionId);
    if (index === -1) {
      return false;
    }
    
    this.transactions.splice(index, 1);
    this.transactionCount = this.transactions.length;
    this.merkleRoot = this.calculateMerkleRoot();
    
    logger.debug(`Transaction removed from block: ${transactionId}`);
    return true;
  }

  /**
   * 获取区块统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    const totalFees = this.transactions.reduce((sum, tx) => sum + (tx.fee || 0), 0);
    const totalAmount = this.transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    return {
      id: this.id,
      height: this.height,
      timestamp: this.timestamp,
      transactionCount: this.transactionCount,
      totalFees,
      totalAmount,
      gasUsed: this.gasUsed,
      gasLimit: this.gasLimit,
      difficulty: this.difficulty,
      nonce: this.nonce,
      validator: this.validator,
      size: JSON.stringify(this.serialize()).length
    };
  }

  /**
   * 序列化区块
   * @returns {object} 序列化后的区块
   */
  serialize() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.serialize ? tx.serialize() : tx),
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      validator: this.validator,
      height: this.height,
      gasUsed: this.gasUsed,
      gasLimit: this.gasLimit,
      transactionCount: this.transactionCount,
      merkleRoot: this.merkleRoot,
      signature: this.signature
    };
  }

  /**
   * 从序列化数据创建区块
   * @param {object} data - 序列化数据
   * @returns {Block} 区块实例
   */
  static deserialize(data) {
    const block = new Block(
      data.timestamp,
      data.transactions,
      data.previousHash,
      data.validator
    );
    
    block.id = data.id;
    block.hash = data.hash;
    block.nonce = data.nonce;
    block.difficulty = data.difficulty;
    block.height = data.height;
    block.gasUsed = data.gasUsed;
    block.gasLimit = data.gasLimit;
    block.transactionCount = data.transactionCount;
    block.merkleRoot = data.merkleRoot;
    block.signature = data.signature;
    
    return block;
  }
}

module.exports = Block;