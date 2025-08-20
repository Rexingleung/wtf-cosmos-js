/**
 * WTF Cosmos JS - Governance Voting
 * 治理投票管理模块
 */

const { logger } = require('../utils/logger');
const { Proposal, ProposalStatus, ProposalType } = require('./Proposal');

/**
 * 投票选项枚举
 */
const VoteOption = {
  YES: 'yes',
  NO: 'no',
  NO_WITH_VETO: 'no_with_veto',
  ABSTAIN: 'abstain'
};

/**
 * 治理投票管理器
 */
class GovernanceManager {
  /**
   * 构造函数
   * @param {Blockchain} blockchain - 区块链实例
   */
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.proposals = new Map();
    this.proposalCounter = 0;
    
    // 治理参数
    this.params = {
      minDeposit: 1000,
      maxDepositPeriod: 172800000, // 2天
      votingPeriod: 172800000, // 2天
      quorum: 0.4, // 40%
      threshold: 0.5, // 50%
      vetoThreshold: 0.334, // 33.4%
      burnVoteVeto: true,
      burnProposalDepositPrevote: false
    };
    
    logger.info('治理管理器初始化完成');
  }

  /**
   * 创建提案
   * @param {Object} proposalData - 提案数据
   * @param {string} proposer - 提案者地址
   * @returns {Proposal} 创建的提案
   */
  createProposal(proposalData, proposer) {
    // 验证提案者余额
    const proposerBalance = this.blockchain.getBalance(proposer);
    if (proposerBalance < this.params.minDeposit) {
      throw new Error('余额不足，无法创建提案');
    }

    // 创建提案
    const proposal = new Proposal({
      id: ++this.proposalCounter,
      proposer,
      title: proposalData.title,
      description: proposalData.description,
      type: proposalData.type || ProposalType.TEXT,
      minDeposit: this.params.minDeposit,
      quorum: this.params.quorum,
      threshold: this.params.threshold,
      vetoThreshold: this.params.vetoThreshold,
      content: proposalData.content || {}
    });

    // 验证提案
    if (!proposal.isValid()) {
      throw new Error('无效的提案数据');
    }

    // 存储提案
    this.proposals.set(proposal.id, proposal);

    // 初始押金
    if (proposalData.initialDeposit && proposalData.initialDeposit > 0) {
      this.addDeposit(proposal.id, proposer, proposalData.initialDeposit);
    }

    logger.info('创建治理提案', {
      proposalId: proposal.id,
      proposer,
      title: proposal.title,
      type: proposal.type
    });

    return proposal;
  }

  /**
   * 添加押金到提案
   * @param {string} proposalId - 提案ID
   * @param {string} depositor - 押金者地址
   * @param {number} amount - 押金数量
   * @returns {boolean} 是否成功
   */
  addDeposit(proposalId, depositor, amount) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('提案不存在');
    }

    // 检查押金者余额
    const depositorBalance = this.blockchain.getBalance(depositor);
    if (depositorBalance < amount) {
      throw new Error('余额不足');
    }

    // 添加押金
    const success = proposal.addDeposit(depositor, amount);
    if (!success) {
      throw new Error('无法添加押金');
    }

    // 扣除押金者余额（简化实现，实际应该通过交易）
    // 这里只是模拟，实际应该创建交易并等待确认
    this.blockchain.balances.set(
      depositor, 
      depositorBalance - amount
    );

    return true;
  }

  /**
   * 投票
   * @param {string} proposalId - 提案ID
   * @param {string} voter - 投票者地址
   * @param {string} option - 投票选项
   * @returns {boolean} 是否成功
   */
  vote(proposalId, voter, option) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('提案不存在');
    }

    // 验证投票选项
    if (!Object.values(VoteOption).includes(option)) {
      throw new Error('无效的投票选项');
    }

    // 获取投票权重（基于质押数量）
    const votingPower = this.getVotingPower(voter);
    if (votingPower === 0) {
      throw new Error('没有投票权');
    }

    // 投票
    const success = proposal.vote(voter, option, votingPower);
    if (!success) {
      throw new Error('投票失败');
    }

    logger.info('治理投票', {
      proposalId: proposal.id,
      voter,
      option,
      votingPower
    });

    return true;
  }

  /**
   * 获取投票权重
   * @param {string} address - 地址
   * @returns {number} 投票权重
   */
  getVotingPower(address) {
    // 简化实现：基于余额计算投票权重
    // 实际应该基于质押的代币数量
    const balance = this.blockchain.getBalance(address);
    return Math.floor(balance / 100); // 每100个代币1票权重
  }

  /**
   * 检查并更新过期提案
   */
  updateExpiredProposals() {
    for (const [proposalId, proposal] of this.proposals) {
      if (proposal.isExpired()) {
        if (proposal.status === ProposalStatus.DEPOSIT_PERIOD) {
          proposal.status = ProposalStatus.FAILED;
          this.refundDeposits(proposal);
        } else if (proposal.status === ProposalStatus.VOTING_PERIOD) {
          proposal.endVoting();
          this.executeProposal(proposal);
        }
      }
    }
  }

  /**
   * 退还押金
   * @param {Proposal} proposal - 提案
   */
  refundDeposits(proposal) {
    if (proposal.status === ProposalStatus.FAILED) {
      // 退还押金
      for (const deposit of proposal.deposits) {
        const currentBalance = this.blockchain.getBalance(deposit.depositor);
        this.blockchain.balances.set(
          deposit.depositor,
          currentBalance + deposit.amount
        );
      }
      
      logger.info('退还提案押金', { proposalId: proposal.id });
    } else if (proposal.status === ProposalStatus.REJECTED && this.params.burnProposalDepositPrevote) {
      // 销毁押金
      logger.info('销毁提案押金', { proposalId: proposal.id });
    }
  }

  /**
   * 执行通过的提案
   * @param {Proposal} proposal - 提案
   */
  executeProposal(proposal) {
    if (proposal.status !== ProposalStatus.PASSED) {
      return;
    }

    try {
      switch (proposal.type) {
        case ProposalType.PARAMETER_CHANGE:
          this.executeParameterChange(proposal);
          break;
        case ProposalType.SOFTWARE_UPGRADE:
          this.executeSoftwareUpgrade(proposal);
          break;
        case ProposalType.SPEND_POOL:
          this.executeSpendPool(proposal);
          break;
        case ProposalType.TEXT:
        default:
          // 文本提案不需要执行
          break;
      }

      // 退还押金给提案者
      this.refundDeposits(proposal);
      
      logger.info('执行提案', {
        proposalId: proposal.id,
        type: proposal.type
      });
    } catch (error) {
      logger.error('执行提案失败', { proposalId: proposal.id, error });
    }
  }

  /**
   * 执行参数修改提案
   * @param {Proposal} proposal - 提案
   */
  executeParameterChange(proposal) {
    const { module, parameter, value } = proposal.content;
    
    switch (module) {
      case 'blockchain':
        this.updateBlockchainParams(parameter, value);
        break;
      case 'governance':
        this.updateGovernanceParams(parameter, value);
        break;
      case 'staking':
        this.updateStakingParams(parameter, value);
        break;
      default:
        throw new Error(`未知的模块: ${module}`);
    }
  }

  /**
   * 更新区块链参数
   * @param {string} parameter - 参数名
   * @param {*} value - 参数值
   */
  updateBlockchainParams(parameter, value) {
    switch (parameter) {
      case 'difficulty':
        this.blockchain.difficulty = value;
        break;
      case 'blockTime':
        this.blockchain.blockTime = value;
        break;
      case 'maxBlockSize':
        this.blockchain.maxBlockSize = value;
        break;
      case 'miningReward':
        this.blockchain.miningReward = value;
        break;
      default:
        throw new Error(`未知的区块链参数: ${parameter}`);
    }
  }

  /**
   * 更新治理参数
   * @param {string} parameter - 参数名
   * @param {*} value - 参数值
   */
  updateGovernanceParams(parameter, value) {
    if (this.params.hasOwnProperty(parameter)) {
      this.params[parameter] = value;
    } else {
      throw new Error(`未知的治理参数: ${parameter}`);
    }
  }

  /**
   * 更新质押参数
   * @param {string} parameter - 参数名
   * @param {*} value - 参数值
   */
  updateStakingParams(parameter, value) {
    // 与验证者管理器交互
    if (this.blockchain.validatorManager) {
      this.blockchain.validatorManager.updateParams(parameter, value);
    }
  }

  /**
   * 执行软件升级提案
   * @param {Proposal} proposal - 提案
   */
  executeSoftwareUpgrade(proposal) {
    const { name, height, info } = proposal.content;
    
    // 记录升级信息
    logger.info('计划软件升级', {
      name,
      height,
      info,
      currentHeight: this.blockchain.chain.length
    });
    
    // 实际实现中会在指定高度停止出块并等待升级
  }

  /**
   * 执行支出提案
   * @param {Proposal} proposal - 提案
   */
  executeSpendPool(proposal) {
    const { recipient, amount, title } = proposal.content;
    
    // 从社区池转账给接收者
    // 简化实现：直接增加接收者余额
    const currentBalance = this.blockchain.getBalance(recipient);
    this.blockchain.balances.set(recipient, currentBalance + amount);
    
    logger.info('执行社区支出', {
      recipient,
      amount,
      title
    });
  }

  /**
   * 获取提案列表
   * @param {Object} filters - 过滤条件
   * @returns {Array<Proposal>} 提案列表
   */
  getProposals(filters = {}) {
    let proposals = Array.from(this.proposals.values());
    
    if (filters.status) {
      proposals = proposals.filter(p => p.status === filters.status);
    }
    
    if (filters.proposer) {
      proposals = proposals.filter(p => p.proposer === filters.proposer);
    }
    
    if (filters.type) {
      proposals = proposals.filter(p => p.type === filters.type);
    }
    
    // 按创建时间倒序排序
    return proposals.sort((a, b) => b.submitTime - a.submitTime);
  }

  /**
   * 获取单个提案
   * @param {string} proposalId - 提案ID
   * @returns {Proposal|null} 提案或null
   */
  getProposal(proposalId) {
    return this.proposals.get(proposalId) || null;
  }

  /**
   * 获取治理统计信息
   * @returns {Object} 统计信息
   */
  getGovernanceStats() {
    const proposals = Array.from(this.proposals.values());
    
    const stats = {
      totalProposals: proposals.length,
      activeProposals: proposals.filter(p => 
        p.status === ProposalStatus.DEPOSIT_PERIOD || 
        p.status === ProposalStatus.VOTING_PERIOD
      ).length,
      passedProposals: proposals.filter(p => p.status === ProposalStatus.PASSED).length,
      rejectedProposals: proposals.filter(p => p.status === ProposalStatus.REJECTED).length,
      failedProposals: proposals.filter(p => p.status === ProposalStatus.FAILED).length,
      totalDeposits: proposals.reduce((sum, p) => sum + p.totalDeposit, 0),
      params: { ...this.params }
    };
    
    return stats;
  }

  /**
   * 导出治理数据
   * @returns {Object} 序列化的数据
   */
  export() {
    return {
      proposals: Object.fromEntries(
        Array.from(this.proposals.entries()).map(([id, proposal]) => [id, proposal.toJSON()])
      ),
      proposalCounter: this.proposalCounter,
      params: this.params
    };
  }

  /**
   * 导入治理数据
   * @param {Object} data - 治理数据
   */
  import(data) {
    // 重建提案
    this.proposals.clear();
    if (data.proposals) {
      for (const [id, proposalData] of Object.entries(data.proposals)) {
        this.proposals.set(id, Proposal.fromJSON(proposalData));
      }
    }
    
    this.proposalCounter = data.proposalCounter || 0;
    this.params = { ...this.params, ...data.params };
    
    logger.info('治理数据导入完成');
  }
}

module.exports = {
  GovernanceManager,
  VoteOption
};