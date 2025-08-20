/**
 * WTF Cosmos JS - Governance Proposal
 * 治理提案模块
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * 提案状态枚举
 */
const ProposalStatus = {
  DEPOSIT_PERIOD: 'deposit_period',
  VOTING_PERIOD: 'voting_period',
  PASSED: 'passed',
  REJECTED: 'rejected',
  FAILED: 'failed'
};

/**
 * 提案类型枚举
 */
const ProposalType = {
  TEXT: 'text',
  PARAMETER_CHANGE: 'parameter_change',
  SOFTWARE_UPGRADE: 'software_upgrade',
  SPEND_POOL: 'spend_pool'
};

/**
 * 提案类
 */
class Proposal {
  /**
   * 构造函数
   * @param {Object} params - 提案参数
   */
  constructor(params) {
    this.id = params.id || this.generateId();
    this.proposer = params.proposer;
    this.title = params.title;
    this.description = params.description;
    this.type = params.type || ProposalType.TEXT;
    this.status = params.status || ProposalStatus.DEPOSIT_PERIOD;
    
    // 时间参数
    this.submitTime = params.submitTime || Date.now();
    this.depositEndTime = params.depositEndTime || (this.submitTime + 172800000); // 2天
    this.votingStartTime = params.votingStartTime || null;
    this.votingEndTime = params.votingEndTime || null;
    
    // 押金相关
    this.totalDeposit = params.totalDeposit || 0;
    this.minDeposit = params.minDeposit || 1000;
    this.deposits = params.deposits || [];
    
    // 投票结果
    this.votes = params.votes || [];
    this.finalTallyResult = params.finalTallyResult || {
      yes: 0,
      no: 0,
      noWithVeto: 0,
      abstain: 0
    };
    
    // 治理参数
    this.quorum = params.quorum || 0.4; // 40% 最小投票率
    this.threshold = params.threshold || 0.5; // 50% 通过阈值
    this.vetoThreshold = params.vetoThreshold || 0.334; // 33.4% 否决阈值
    
    // 提案内容（针对参数修改等类型）
    this.content = params.content || {};
    
    this.hash = this.calculateHash();
  }

  /**
   * 生成提案ID
   * @returns {string} 提案ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 计算提案哈希
   * @returns {string} 哈希值
   */
  calculateHash() {
    const data = {
      id: this.id,
      proposer: this.proposer,
      title: this.title,
      description: this.description,
      type: this.type,
      submitTime: this.submitTime,
      content: this.content
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * 添加押金
   * @param {string} depositor - 押金者地址
   * @param {number} amount - 押金数量
   * @returns {boolean} 是否成功
   */
  addDeposit(depositor, amount) {
    if (this.status !== ProposalStatus.DEPOSIT_PERIOD) {
      return false;
    }

    if (Date.now() > this.depositEndTime) {
      this.status = ProposalStatus.FAILED;
      return false;
    }

    // 添加押金记录
    this.deposits.push({
      depositor,
      amount,
      timestamp: Date.now()
    });

    this.totalDeposit += amount;

    // 检查是否达到最小押金要求
    if (this.totalDeposit >= this.minDeposit) {
      this.enterVotingPeriod();
    }

    logger.info('添加提案押金', { 
      proposalId: this.id,
      depositor,
      amount,
      totalDeposit: this.totalDeposit 
    });

    return true;
  }

  /**
   * 进入投票期
   */
  enterVotingPeriod() {
    this.status = ProposalStatus.VOTING_PERIOD;
    this.votingStartTime = Date.now();
    this.votingEndTime = this.votingStartTime + 172800000; // 2天投票期

    logger.info('提案进入投票期', { 
      proposalId: this.id,
      votingStartTime: this.votingStartTime,
      votingEndTime: this.votingEndTime 
    });
  }

  /**
   * 投票
   * @param {string} voter - 投票者地址
   * @param {string} option - 投票选项 (yes/no/no_with_veto/abstain)
   * @param {number} votingPower - 投票权重
   * @returns {boolean} 是否成功
   */
  vote(voter, option, votingPower = 1) {
    if (this.status !== ProposalStatus.VOTING_PERIOD) {
      return false;
    }

    if (Date.now() > this.votingEndTime) {
      this.endVoting();
      return false;
    }

    // 检查是否已经投票
    const existingVoteIndex = this.votes.findIndex(v => v.voter === voter);
    if (existingVoteIndex !== -1) {
      // 更新投票
      const oldVote = this.votes[existingVoteIndex];
      this.finalTallyResult[oldVote.option] -= oldVote.votingPower;
      this.votes[existingVoteIndex] = { voter, option, votingPower, timestamp: Date.now() };
    } else {
      // 新投票
      this.votes.push({ voter, option, votingPower, timestamp: Date.now() });
    }

    // 更新计票结果
    this.finalTallyResult[option] = (this.finalTallyResult[option] || 0) + votingPower;

    logger.info('提案投票', { 
      proposalId: this.id,
      voter,
      option,
      votingPower 
    });

    return true;
  }

  /**
   * 结束投票
   */
  endVoting() {
    if (this.status !== ProposalStatus.VOTING_PERIOD) {
      return;
    }

    const totalVotes = Object.values(this.finalTallyResult)
      .reduce((sum, votes) => sum + votes, 0);

    // 检查投票率（简化版，实际应该从区块链获取总质押量）
    const totalStake = 1000000; // 假设总质押量
    const turnout = totalVotes / totalStake;

    if (turnout < this.quorum) {
      this.status = ProposalStatus.FAILED;
      logger.info('提案投票率不足', { 
        proposalId: this.id,
        turnout,
        requiredQuorum: this.quorum 
      });
      return;
    }

    // 检查否决
    const vetoRatio = this.finalTallyResult.noWithVeto / totalVotes;
    if (vetoRatio >= this.vetoThreshold) {
      this.status = ProposalStatus.REJECTED;
      logger.info('提案被否决', { 
        proposalId: this.id,
        vetoRatio,
        vetoThreshold: this.vetoThreshold 
      });
      return;
    }

    // 检查通过阈值
    const yesVotes = this.finalTallyResult.yes;
    const noVotes = this.finalTallyResult.no + this.finalTallyResult.noWithVeto;
    const yesRatio = yesVotes / (yesVotes + noVotes);

    if (yesRatio >= this.threshold) {
      this.status = ProposalStatus.PASSED;
      logger.info('提案通过', { 
        proposalId: this.id,
        yesRatio,
        threshold: this.threshold 
      });
    } else {
      this.status = ProposalStatus.REJECTED;
      logger.info('提案被拒绝', { 
        proposalId: this.id,
        yesRatio,
        threshold: this.threshold 
      });
    }
  }

  /**
   * 检查提案是否过期
   * @returns {boolean} 是否过期
   */
  isExpired() {
    const now = Date.now();
    
    if (this.status === ProposalStatus.DEPOSIT_PERIOD) {
      return now > this.depositEndTime;
    }
    
    if (this.status === ProposalStatus.VOTING_PERIOD) {
      return now > this.votingEndTime;
    }
    
    return false;
  }

  /**
   * 获取提案状态信息
   * @returns {Object} 状态信息
   */
  getStatusInfo() {
    const now = Date.now();
    let timeRemaining = 0;
    
    if (this.status === ProposalStatus.DEPOSIT_PERIOD) {
      timeRemaining = Math.max(0, this.depositEndTime - now);
    } else if (this.status === ProposalStatus.VOTING_PERIOD) {
      timeRemaining = Math.max(0, this.votingEndTime - now);
    }
    
    return {
      status: this.status,
      timeRemaining,
      totalDeposit: this.totalDeposit,
      minDeposit: this.minDeposit,
      depositProgress: this.totalDeposit / this.minDeposit,
      votingResults: { ...this.finalTallyResult },
      totalVotes: Object.values(this.finalTallyResult).reduce((sum, v) => sum + v, 0)
    };
  }

  /**
   * 验证提案
   * @returns {boolean} 是否有效
   */
  isValid() {
    if (!this.proposer || !this.title || !this.description) {
      return false;
    }
    
    if (!Object.values(ProposalType).includes(this.type)) {
      return false;
    }
    
    if (this.title.length > 200 || this.description.length > 2000) {
      return false;
    }
    
    return true;
  }

  /**
   * 序列化提案
   * @returns {Object} 序列化数据
   */
  toJSON() {
    return {
      id: this.id,
      proposer: this.proposer,
      title: this.title,
      description: this.description,
      type: this.type,
      status: this.status,
      submitTime: this.submitTime,
      depositEndTime: this.depositEndTime,
      votingStartTime: this.votingStartTime,
      votingEndTime: this.votingEndTime,
      totalDeposit: this.totalDeposit,
      minDeposit: this.minDeposit,
      deposits: this.deposits,
      votes: this.votes,
      finalTallyResult: this.finalTallyResult,
      content: this.content,
      hash: this.hash
    };
  }

  /**
   * 从 JSON 创建提案
   * @param {Object} data - JSON 数据
   * @returns {Proposal} 提案实例
   */
  static fromJSON(data) {
    return new Proposal(data);
  }
}

module.exports = {
  Proposal,
  ProposalStatus,
  ProposalType
};