/**
 * WTF Cosmos JS - Validator
 * 验证器类
 */

const { generateRandomId, getCurrentTimestamp } = require('../utils/helpers');
const { logger } = require('../utils/logger');
const config = require('../config');

class Validator {
  constructor(address, stake, commission = 0.1, description = '') {
    this.address = address;
    this.stake = stake;
    this.commission = commission; // 佣金比例
    this.description = description;
    this.jailed = false;
    this.status = 'active'; // active, inactive, jailed
    this.createdAt = getCurrentTimestamp();
    this.lastActiveTime = getCurrentTimestamp();
    
    // 验证器统计
    this.blocksProposed = 0;
    this.blocksValidated = 0;
    this.missedBlocks = 0;
    this.totalRewards = 0;
    this.slashingEvents = [];
    
    // 委托相关
    this.delegators = new Map(); // 委托者地址 -> 委托金额
    this.totalDelegated = 0;
    this.selfStake = stake;
    
    // 投票权重
    this.votingPower = this.calculateVotingPower();
    
    logger.info(`验证器创建: ${address}`);
  }

  /**
   * 计算投票权重
   * @returns {number} 投票权重
   */
  calculateVotingPower() {
    return this.stake + this.totalDelegated;
  }

  /**
   * 添加委托
   * @param {string} delegatorAddress - 委托者地址
   * @param {number} amount - 委托金额
   */
  addDelegation(delegatorAddress, amount) {
    try {
      const currentDelegation = this.delegators.get(delegatorAddress) || 0;
      this.delegators.set(delegatorAddress, currentDelegation + amount);
      this.totalDelegated += amount;
      this.votingPower = this.calculateVotingPower();
      
      logger.info(`委托添加: ${delegatorAddress} -> ${this.address}, 金额: ${amount}`);
    } catch (error) {
      logger.error('添加委托失败:', error);
      throw error;
    }
  }

  /**
   * 移除委托
   * @param {string} delegatorAddress - 委托者地址
   * @param {number} amount - 移除金额
   */
  removeDelegation(delegatorAddress, amount) {
    try {
      const currentDelegation = this.delegators.get(delegatorAddress) || 0;
      
      if (currentDelegation < amount) {
        throw new Error('委托金额不足');
      }
      
      const newDelegation = currentDelegation - amount;
      if (newDelegation === 0) {
        this.delegators.delete(delegatorAddress);
      } else {
        this.delegators.set(delegatorAddress, newDelegation);
      }
      
      this.totalDelegated -= amount;
      this.votingPower = this.calculateVotingPower();
      
      logger.info(`委托移除: ${delegatorAddress} -> ${this.address}, 金额: ${amount}`);
    } catch (error) {
      logger.error('移除委托失败:', error);
      throw error;
    }
  }

  /**
   * 增加自质押
   * @param {number} amount - 增加金额
   */
  addSelfStake(amount) {
    this.selfStake += amount;
    this.stake += amount;
    this.votingPower = this.calculateVotingPower();
    
    logger.info(`验证器自质押增加: ${this.address}, 金额: ${amount}`);
  }

  /**
   * 减少自质押
   * @param {number} amount - 减少金额
   */
  removeSelfStake(amount) {
    if (this.selfStake < amount) {
      throw new Error('自质押金额不足');
    }
    
    this.selfStake -= amount;
    this.stake -= amount;
    this.votingPower = this.calculateVotingPower();
    
    // 检查是否低于最小质押要求
    if (this.stake < config.CONSENSUS.MIN_VALIDATOR_STAKE) {
      this.status = 'inactive';
      logger.warn(`验证器质押不足，状态变为非活跃: ${this.address}`);
    }
    
    logger.info(`验证器自质押减少: ${this.address}, 金额: ${amount}`);
  }

  /**
   * 出块成功
   */
  onBlockProposed() {
    this.blocksProposed++;
    this.lastActiveTime = getCurrentTimestamp();
    logger.debug(`验证器出块: ${this.address}, 总出块数: ${this.blocksProposed}`);
  }

  /**
   * 验证块成功
   */
  onBlockValidated() {
    this.blocksValidated++;
    this.lastActiveTime = getCurrentTimestamp();
  }

  /**
   * 错过出块
   */
  onMissedBlock() {
    this.missedBlocks++;
    
    // 检查是否需要监禁
    if (this.missedBlocks >= config.CONSENSUS.DOWNTIME_THRESHOLD) {
      this.jail('连续错过出块');
    }
    
    logger.warn(`验证器错过出块: ${this.address}, 总错过数: ${this.missedBlocks}`);
  }

  /**
   * 监禁验证器
   * @param {string} reason - 监禁原因
   */
  jail(reason) {
    this.jailed = true;
    this.status = 'jailed';
    
    // 惩罚 (Slashing)
    const slashingAmount = Math.floor(this.stake * config.CONSENSUS.SLASHING_FRACTION);
    this.stake -= slashingAmount;
    this.votingPower = this.calculateVotingPower();
    
    // 记录惩罚事件
    const slashingEvent = {
      timestamp: getCurrentTimestamp(),
      reason,
      amount: slashingAmount,
      height: 0 // 这里应该是当前区块高度
    };
    this.slashingEvents.push(slashingEvent);
    
    logger.warn(`验证器被监禁: ${this.address}, 原因: ${reason}, 惩罚金额: ${slashingAmount}`);
  }

  /**
   * 解除监禁
   */
  unjail() {
    if (!this.jailed) {
      throw new Error('验证器未被监禁');
    }
    
    // 检查监禁时间是否足够
    const now = getCurrentTimestamp();
    const lastSlashing = this.slashingEvents[this.slashingEvents.length - 1];
    if (lastSlashing && (now - lastSlashing.timestamp) < config.CONSENSUS.JAIL_TIME) {
      throw new Error('监禁时间未满');
    }
    
    this.jailed = false;
    this.status = 'active';
    this.missedBlocks = 0; // 重置错过块计数
    
    logger.info(`验证器解除监禁: ${this.address}`);
  }

  /**
   * 停用验证器
   */
  deactivate() {
    this.status = 'inactive';
    logger.info(`验证器停用: ${this.address}`);
  }

  /**
   * 激活验证器
   */
  activate() {
    if (this.jailed) {
      throw new Error('验证器处于监禁状态，无法激活');
    }
    
    if (this.stake < config.CONSENSUS.MIN_VALIDATOR_STAKE) {
      throw new Error('质押金额不足，无法激活');
    }
    
    this.status = 'active';
    logger.info(`验证器激活: ${this.address}`);
  }

  /**
   * 分发奖励
   * @param {number} totalReward - 总奖励
   */
  distributeReward(totalReward) {
    try {
      // 计算佣金
      const commission = Math.floor(totalReward * this.commission);
      const delegatorReward = totalReward - commission;
      
      // 验证器获得佣金
      this.totalRewards += commission;
      
      // 按比例分配给委托者
      const rewards = new Map();
      
      if (this.totalDelegated > 0) {
        for (const [delegatorAddress, delegation] of this.delegators) {
          const delegatorShare = Math.floor((delegation / this.totalDelegated) * delegatorReward);
          rewards.set(delegatorAddress, delegatorShare);
        }
      }
      
      logger.debug(`奖励分发: ${this.address}, 总奖励: ${totalReward}, 佣金: ${commission}`);
      return rewards;
    } catch (error) {
      logger.error('分发奖励失败:', error);
      throw error;
    }
  }

  /**
   * 检查验证器是否活跃
   * @returns {boolean} 是否活跃
   */
  isActive() {
    return this.status === 'active' && !this.jailed && this.stake >= config.CONSENSUS.MIN_VALIDATOR_STAKE;
  }

  /**
   * 获取验证器统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    const uptime = this.blocksProposed + this.blocksValidated > 0 ? 
      (this.blocksValidated / (this.blocksProposed + this.blocksValidated)) * 100 : 0;
    
    return {
      address: this.address,
      stake: this.stake,
      totalDelegated: this.totalDelegated,
      votingPower: this.votingPower,
      commission: this.commission,
      status: this.status,
      jailed: this.jailed,
      blocksProposed: this.blocksProposed,
      blocksValidated: this.blocksValidated,
      missedBlocks: this.missedBlocks,
      uptime: uptime.toFixed(2) + '%',
      totalRewards: this.totalRewards,
      delegatorsCount: this.delegators.size,
      slashingEventsCount: this.slashingEvents.length,
      createdAt: this.createdAt,
      lastActiveTime: this.lastActiveTime
    };
  }

  /**
   * 获取委托者信息
   * @returns {Array} 委托者列表
   */
  getDelegators() {
    return Array.from(this.delegators.entries()).map(([address, amount]) => ({
      address,
      amount,
      percentage: this.totalDelegated > 0 ? (amount / this.totalDelegated * 100).toFixed(2) + '%' : '0%'
    }));
  }

  /**
   * 序列化验证器
   * @returns {object} 序列化后的验证器
   */
  serialize() {
    return {
      address: this.address,
      stake: this.stake,
      commission: this.commission,
      description: this.description,
      jailed: this.jailed,
      status: this.status,
      createdAt: this.createdAt,
      lastActiveTime: this.lastActiveTime,
      blocksProposed: this.blocksProposed,
      blocksValidated: this.blocksValidated,
      missedBlocks: this.missedBlocks,
      totalRewards: this.totalRewards,
      slashingEvents: this.slashingEvents,
      delegators: Array.from(this.delegators.entries()),
      totalDelegated: this.totalDelegated,
      selfStake: this.selfStake,
      votingPower: this.votingPower
    };
  }

  /**
   * 从序列化数据创建验证器
   * @param {object} data - 序列化数据
   * @returns {Validator} 验证器实例
   */
  static deserialize(data) {
    const validator = new Validator(
      data.address,
      data.stake,
      data.commission,
      data.description
    );
    
    validator.jailed = data.jailed;
    validator.status = data.status;
    validator.createdAt = data.createdAt;
    validator.lastActiveTime = data.lastActiveTime;
    validator.blocksProposed = data.blocksProposed;
    validator.blocksValidated = data.blocksValidated;
    validator.missedBlocks = data.missedBlocks;
    validator.totalRewards = data.totalRewards;
    validator.slashingEvents = data.slashingEvents || [];
    validator.delegators = new Map(data.delegators || []);
    validator.totalDelegated = data.totalDelegated || 0;
    validator.selfStake = data.selfStake || data.stake;
    validator.votingPower = data.votingPower || validator.calculateVotingPower();
    
    return validator;
  }
}

module.exports = Validator;