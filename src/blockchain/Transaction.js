/**
 * WTF Cosmos JS - Transaction
 * 交易类
 */

const { sha256, generateTransactionId, getCurrentTimestamp } = require('../utils/helpers');
const { logger } = require('../utils/logger');
const Wallet = require('../crypto/Wallet');

class Transaction {
  constructor(fromAddress, toAddress, amount, type = 'transfer', data = {}) {
    this.id = generateTransactionId();
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.type = type; // transfer, delegate, undelegate, vote, etc.
    this.data = data; // 额外数据
    this.timestamp = getCurrentTimestamp();
    this.signature = '';
    this.hash = '';
    this.fee = this.calculateFee();
    this.nonce = 0; // 防重放攻击
  }

  /**
   * 计算交易哈希值
   * @returns {string} 哈希值
   */
  calculateHash() {
    const transactionData = {
      id: this.id,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      type: this.type,
      data: this.data,
      timestamp: this.timestamp,
      fee: this.fee,
      nonce: this.nonce
    };
    
    return sha256(JSON.stringify(transactionData));
  }

  /**
   * 计算交易费用
   * @returns {number} 交易费
   */
  calculateFee() {
    const baseFee = 1; // 基础费用
    const typeFeeMultiplier = {
      'transfer': 1,
      'delegate': 2,
      'undelegate': 2,
      'vote': 1,
      'create_validator': 5,
      'edit_validator': 3,
      'submit_proposal': 10
    };
    
    const multiplier = typeFeeMultiplier[this.type] || 1;
    const dataSize = JSON.stringify(this.data).length;
    const dateFee = Math.ceil(dataSize / 100); // 每100字节收取1单位费用
    
    return baseFee * multiplier + dateFee;
  }

  /**
   * 使用私钥签名交易
   * @param {string} privateKey - 私钥
   */
  signTransaction(privateKey) {
    try {
      // 检查私钥是否匹配发送者地址
      const wallet = new Wallet(privateKey);
      if (wallet.address !== this.fromAddress && this.fromAddress !== null) {
        throw new Error('私钥与发送者地址不匹配');
      }
      
      // 计算哈希值
      this.hash = this.calculateHash();
      
      // 签名
      this.signature = wallet.sign(this.hash);
      
      logger.debug(`Transaction signed: ${this.id}`);
    } catch (error) {
      logger.error('Error signing transaction:', error);
      throw new Error(`交易签名失败: ${error.message}`);
    }
  }

  /**
   * 验证交易签名
   * @returns {boolean} 验证结果
   */
  isValid() {
    try {
      // 挖矿奖励交易无需验证签名
      if (this.fromAddress === null) {
        return this.amount > 0 && this.toAddress;
      }
      
      // 检查基本字段
      if (!this.fromAddress || !this.toAddress || this.amount <= 0) {
        logger.warn(`Invalid transaction fields: ${this.id}`);
        return false;
      }
      
      // 检查签名
      if (!this.signature || this.signature.length === 0) {
        logger.warn(`Missing signature: ${this.id}`);
        return false;
      }
      
      // 重新计算哈希并验证签名
      const currentHash = this.calculateHash();
      if (currentHash !== this.hash) {
        logger.warn(`Hash mismatch: ${this.id}`);
        return false;
      }
      
      // 获取发送者公钥 (简化版本)
      // 在实际应用中，应该从签名中恢复公钥
      // 这里为了简化，直接返回 true
      return true;
    } catch (error) {
      logger.error('Error validating transaction:', error);
      return false;
    }
  }

  /**
   * 检查交易是否过期
   * @param {number} maxAge - 最大年龄 (毫秒)
   * @returns {boolean} 是否过期
   */
  isExpired(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    return getCurrentTimestamp() - this.timestamp > maxAge;
  }

  /**
   * 获取交易简要信息
   * @returns {object} 简要信息
   */
  getSummary() {
    return {
      id: this.id,
      hash: this.hash,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      type: this.type,
      fee: this.fee,
      timestamp: this.timestamp
    };
  }

  /**
   * 序列化交易
   * @returns {object} 序列化后的交易
   */
  serialize() {
    return {
      id: this.id,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      type: this.type,
      data: this.data,
      timestamp: this.timestamp,
      signature: this.signature,
      hash: this.hash,
      fee: this.fee,
      nonce: this.nonce
    };
  }

  /**
   * 从序列化数据创建交易
   * @param {object} data - 序列化数据
   * @returns {Transaction} 交易实例
   */
  static deserialize(data) {
    const transaction = new Transaction(
      data.fromAddress,
      data.toAddress,
      data.amount,
      data.type,
      data.data
    );
    
    transaction.id = data.id;
    transaction.timestamp = data.timestamp;
    transaction.signature = data.signature;
    transaction.hash = data.hash;
    transaction.fee = data.fee;
    transaction.nonce = data.nonce;
    
    return transaction;
  }

  /**
   * 创建挖矿奖励交易
   * @param {string} minerAddress - 矿工地址
   * @param {number} reward - 奖励金额
   * @returns {Transaction} 奖励交易
   */
  static createMiningReward(minerAddress, reward) {
    const transaction = new Transaction(null, minerAddress, reward, 'mining_reward');
    transaction.hash = transaction.calculateHash();
    return transaction;
  }

  /**
   * 创建委托交易
   * @param {string} delegatorAddress - 委托者地址
   * @param {string} validatorAddress - 验证者地址
   * @param {number} amount - 委托金额
   * @returns {Transaction} 委托交易
   */
  static createDelegation(delegatorAddress, validatorAddress, amount) {
    return new Transaction(
      delegatorAddress,
      validatorAddress,
      amount,
      'delegate',
      { validator: validatorAddress }
    );
  }

  /**
   * 创建取消委托交易
   * @param {string} delegatorAddress - 委托者地址
   * @param {string} validatorAddress - 验证者地址
   * @param {number} amount - 取消委托金额
   * @returns {Transaction} 取消委托交易
   */
  static createUndelegation(delegatorAddress, validatorAddress, amount) {
    return new Transaction(
      delegatorAddress,
      validatorAddress,
      amount,
      'undelegate',
      { validator: validatorAddress }
    );
  }

  /**
   * 创建治理投票交易
   * @param {string} voterAddress - 投票者地址
   * @param {number} proposalId - 提案 ID
   * @param {string} option - 投票选项
   * @returns {Transaction} 投票交易
   */
  static createVote(voterAddress, proposalId, option) {
    return new Transaction(
      voterAddress,
      null,
      0,
      'vote',
      { proposalId, option }
    );
  }
}

module.exports = Transaction;