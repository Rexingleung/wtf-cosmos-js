/**
 * WTF Cosmos JS - Blockchain
 * 区块链主类，负责管理区块链状态和交易处理
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { helpers } = require('../utils/helpers');
const Block = require('./Block');
const Transaction = require('./Transaction');
const ProofOfWork = require('../consensus/ProofOfWork');
const ValidatorManager = require('../consensus/Validator');

/**
 * 区块链类
 * 管理完整的区块链状态，包括区块、交易、验证者和治理
 */
class Blockchain {
  /**
   * 构造函数
   * @param {Object} config - 配置参数
   */
  constructor(config = {}) {
    this.chain = [];
    this.pendingTransactions = [];
    this.miningReward = config.miningReward || 50;
    this.difficulty = config.difficulty || 4;
    this.blockTime = config.blockTime || 60000; // 1分钟
    this.maxBlockSize = config.maxBlockSize || 1048576; // 1MB
    
    // 账户余额映射
    console.log(88888);
    
    this.balances = new Map();
    
    // 验证者管理
    this.validatorManager = new ValidatorManager(this);
    
    // 工作量证明
    this.proofOfWork = new ProofOfWork(this);
    
    // 统计信息
    this.stats = {
      totalSupply: 0,
      totalTransactions: 0,
      totalBlocks: 0,
      averageBlockTime: 0,
      hashRate: 0
    };
    
    // 挖矿状态
    this.isMining = false;
    this.currentMiner = null;
    
    // 创建创世区块
    this.createGenesisBlock();
    
    logger.info('区块链初始化完成');
  }

  /**
   * 创建创世区块
   */
  createGenesisBlock() {
    const genesisBlock = new Block({
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: '0',
      validator: 'genesis'
    });
    
    genesisBlock.hash = genesisBlock.calculateHash();
    
    this.chain.push(genesisBlock);
    // 初始化创世账户（用于测试）
    const genesisAddress = 'wtf1genesis000000000000000000000000';
    this.balances.set(genesisAddress, 1000000); // 100万初始代币
    this.stats.totalSupply = 1000000;
    this.stats.totalBlocks = 1;
    
    logger.info('创世区块已创建', { hash: genesisBlock.hash });
  }

  /**
   * 获取最新区块
   * @returns {Block} 最新区块
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * 添加交易到交易池
   * @param {Transaction} transaction - 交易对象
   * @returns {boolean} 是否成功添加
   */
  addTransaction(transaction) {
    try {
      // 验证交易
      if (!this.validateTransaction(transaction)) {
        throw new Error('无效的交易');
      }

      // 检查余额
      const senderBalance = this.getBalance(transaction.fromAddress);
      if (senderBalance < transaction.amount + transaction.fee) {
        throw new Error('余额不足');
      }

      // 检查交易池大小
      if (this.pendingTransactions.length >= 1000) {
        throw new Error('交易池已满');
      }

      this.pendingTransactions.push(transaction);
      logger.info('交易已添加到交易池', { 
        hash: transaction.hash,
        from: transaction.fromAddress,
        to: transaction.toAddress,
        amount: transaction.amount 
      });
      
      return true;
    } catch (error) {
      logger.error('添加交易失败', error);
      return false;
    }
  }

  /**
   * 验证交易
   * @param {Transaction} transaction - 交易对象
   * @returns {boolean} 是否有效
   */
  validateTransaction(transaction) {
    // 检查基本字段
    if (!transaction.fromAddress || !transaction.toAddress) {
      return false;
    }

    if (transaction.amount <= 0) {
      return false;
    }

    // 验证数字签名
    if (!transaction.isValid()) {
      return false;
    }

    // 检查是否重复交易
    if (this.isTransactionExists(transaction.hash)) {
      return false;
    }

    return true;
  }

  /**
   * 检查交易是否已存在
   * @param {string} transactionHash - 交易哈希
   * @returns {boolean} 是否存在
   */
  isTransactionExists(transactionHash) {
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.hash === transactionHash) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 开始挖矿
   * @param {string} minerAddress - 矿工地址
   * @returns {Promise<Block>} 挖出的区块
   */
  async minePendingTransactions(minerAddress) {
    if (this.isMining) {
      throw new Error('已经在挖矿中');
    }

    this.isMining = true;
    this.currentMiner = minerAddress;
    
    try {
      const startTime = Date.now();
      console.log(1);
      
      // 创建挖矿奖励交易
      const rewardTransaction = new Transaction(
        null,
        minerAddress,
        this.miningReward,
        0,
        'mining_reward'
      );
      console.log(2);
      
      // 选择要打包的交易（按手续费排序）
      const selectedTransactions = this.selectTransactionsForBlock();
      console.log(3);
      selectedTransactions.push(rewardTransaction);
      
      // 创建新区块
      const newBlock = new Block({
        index: this.chain.length,
        timestamp: Date.now(),
        transactions: selectedTransactions,
        previousHash: this.getLatestBlock().hash,
        validator: minerAddress
      });
      console.log(4);
      
      // 使用 PoW 挖矿
      await this.proofOfWork.mineBlock(newBlock, this.difficulty);
      console.log(5);
      // 验证区块
      if (!this.validateBlock(newBlock)) {
        throw new Error('挖出的区块无效');
      }
      console.log(6);
      // 添加到链中
      this.chain.push(newBlock);
      console.log(7);
      
      // 更新余额
      this.updateBalances(selectedTransactions);
      console.log(8);
      
      // 清除已打包的交易
      this.removePendingTransactions(selectedTransactions);
      console.log(9);
      
      // 更新统计信息
      this.updateStats(newBlock, Date.now() - startTime);
      console.log(10);
      
      logger.info('成功挖出新区块', {
        index: newBlock.index,
        hash: newBlock.hash,
        nonce: newBlock.nonce,
        transactions: newBlock.transactions.length,
        miningTime: Date.now() - startTime
      });
      
      return newBlock;
    } finally {
      this.isMining = false;
      this.currentMiner = null;
    }
  }

  /**
   * 选择要打包的交易
   * @returns {Array<Transaction>} 选中的交易
   */
  selectTransactionsForBlock() {
    // 按手续费从高到低排序
    const sortedTransactions = [...this.pendingTransactions]
      .sort((a, b) => b.fee - a.fee);
    
    const selectedTransactions = [];
    let blockSize = 0;
    
    for (const transaction of sortedTransactions) {
      const transactionSize = JSON.stringify(transaction).length;
      
      if (blockSize + transactionSize > this.maxBlockSize) {
        break;
      }
      
      // 再次验证交易（防止双花）
      if (this.validateTransaction(transaction)) {
        selectedTransactions.push(transaction);
        blockSize += transactionSize;
      }
    }
    
    return selectedTransactions;
  }

  /**
   * 验证区块
   * @param {Block} block - 要验证的区块
   * @returns {boolean} 是否有效
   */
  validateBlock(block) {
    // 验证区块基本结构
    if (!block.isValid()) {
      return false;
    }
    
    // 验证前一个区块的哈希
    if (block.previousHash !== this.getLatestBlock().hash) {
      return false;
    }
    
    // 验证工作量证明
    if (!this.proofOfWork.validateProof(block, this.difficulty)) {
      return false;
    }
    
    // 验证所有交易
    for (const transaction of block.transactions) {
      if (!this.validateTransaction(transaction)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 更新账户余额
   * @param {Array<Transaction>} transactions - 交易数组
   */
  updateBalances(transactions) {
    for (const transaction of transactions) {
      if (transaction.fromAddress) {
        // 扣除发送方余额
        const fromBalance = this.getBalance(transaction.fromAddress);
        this.balances.set(
          transaction.fromAddress, 
          fromBalance - transaction.amount - transaction.fee
        );
      }
      
      // 增加接收方余额
      const toBalance = this.getBalance(transaction.toAddress);
      this.balances.set(transaction.toAddress, toBalance + transaction.amount);
      
      // 挖矿奖励增加总供应量
      if (transaction.type === 'mining_reward') {
        this.stats.totalSupply += transaction.amount;
      }
    }
  }

  /**
   * 从交易池中移除已打包的交易
   * @param {Array<Transaction>} processedTransactions - 已处理的交易
   */
  removePendingTransactions(processedTransactions) {
    const processedHashes = new Set(
      processedTransactions
        .filter(tx => tx.type !== 'mining_reward')
        .map(tx => tx.hash)
    );
    
    this.pendingTransactions = this.pendingTransactions.filter(
      tx => !processedHashes.has(tx.hash)
    );
  }

  /**
   * 更新统计信息
   * @param {Block} block - 新区块
   * @param {number} miningTime - 挖矿时间
   */
  updateStats(block, miningTime) {
    this.stats.totalBlocks++;
    this.stats.totalTransactions += block.transactions.length;
    
    // 计算平均出块时间
    if (this.chain.length > 1) {
      const blockTimes = [];
      for (let i = 1; i < Math.min(this.chain.length, 100); i++) {
        const timeDiff = this.chain[i].timestamp - this.chain[i - 1].timestamp;
        blockTimes.push(timeDiff);
      }
      this.stats.averageBlockTime = 
        blockTimes.reduce((sum, time) => sum + time, 0) / blockTimes.length;
    }
    
    // 估算算力 (hash/s)
    this.stats.hashRate = Math.pow(2, this.difficulty) / (miningTime / 1000);
  }

  /**
   * 获取账户余额
   * @param {string} address - 账户地址
   * @returns {number} 余额
   */
  getBalance(address) {
    return this.balances.get(address) || 0;
  }
  /**
   * 获取账户余额
   * @param {string} address - 账户地址
   * @returns {number} 余额
   */
  getBalanceOfAddress(address) {
    return this.balances.get(address) || 0;
  }

  /**
   * 设置账户余额
   * @param {string} address - 账户地址
   * @returns {number} 余额
   */
  setBalance(address) {
    if (address) {
      this.balances.set(address, Math.floor(Math.random() * 100));
      const b = this.getBalance(address)
      return b
    }
  }

  /**
   * 获取区块链统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      chainLength: this.chain.length,
      pendingTransactions: this.pendingTransactions.length,
      difficulty: this.difficulty,
      isMining: this.isMining,
      currentMiner: this.currentMiner
    };
  }

  /**
   * 根据哈希获取区块
   * @param {string} hash - 区块哈希
   * @returns {Block|null} 区块或null
   */
  getBlockByHash(hash) {
    return this.chain.find(block => block.hash === hash) || null;
  }

  /**
   * 根据索引获取区块
   * @param {number} index - 区块索引
   * @returns {Block|null} 区块或null
   */
  getBlockByIndex(index) {
    return this.chain[index] || null;
  }

  /**
   * 获取交易历史
   * @param {string} address - 账户地址
   * @returns {Array<Transaction>} 交易历史
   */
  getTransactionHistory(address) {
    const transactions = [];
    
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.fromAddress === address || transaction.toAddress === address) {
          transactions.push({
            ...transaction,
            blockIndex: block.index,
            blockHash: block.hash,
            timestamp: block.timestamp
          });
        }
      }
    }
    
    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 验证整个区块链
   * @returns {boolean} 是否有效
   */
  validateChain() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      if (!currentBlock.isValid()) {
        return false;
      }
      
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 调整挖矿难度
   */
  adjustDifficulty() {
    if (this.chain.length % 10 === 0 && this.chain.length > 0) {
      const lastTenBlocks = this.chain.slice(-10);
      const totalTime = lastTenBlocks[9].timestamp - lastTenBlocks[0].timestamp;
      const expectedTime = this.blockTime * 10;
      
      if (totalTime < expectedTime / 2) {
        this.difficulty++;
      } else if (totalTime > expectedTime * 2) {
        this.difficulty = Math.max(1, this.difficulty - 1);
      }
      
      logger.info('难度调整', { 
        newDifficulty: this.difficulty,
        actualTime: totalTime,
        expectedTime: expectedTime 
      });
    }
  }

  /**
   * 导出区块链数据
   * @returns {Object} 序列化的区块链数据
   */
  export() {
    return {
      chain: this.chain,
      balances: Object.fromEntries(this.balances),
      stats: this.stats,
      difficulty: this.difficulty,
      pendingTransactions: this.pendingTransactions
    };
  }

  /**
   * 导入区块链数据
   * @param {Object} data - 区块链数据
   */
  import(data) {
    this.chain = data.chain || [];
    this.balances = new Map(Object.entries(data.balances || {}));
    this.stats = data.stats || this.stats;
    this.difficulty = data.difficulty || this.difficulty;
    this.pendingTransactions = data.pendingTransactions || [];
    
    logger.info('区块链数据导入完成');
  }
}

module.exports = Blockchain;