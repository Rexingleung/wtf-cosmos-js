/**
 * WTF Cosmos JS - Governance API
 * 治理 API 路由
 */

const express = require('express');
const { Transaction } = require('../blockchain');
const { logger } = require('../utils/logger');
const { isValidAddress, generateRandomId, getCurrentTimestamp } = require('../utils/helpers');
const config = require('../config');
const router = express.Router();

/**
 * 获取所有提案
 */
router.get('/proposals', (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const blockchain = req.app.locals.blockchain;
    
    let proposals = Array.from(blockchain.proposals.values());
    
    // 过滤状态
    if (status !== 'all') {
      proposals = proposals.filter(p => p.status === status);
    }
    
    // 排序 (最新的在前)
    proposals.sort((a, b) => b.submitTime - a.submitTime);
    
    // 分页
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProposals = proposals.slice(startIndex, endIndex);
    
    res.json({
      proposals: paginatedProposals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: proposals.length,
        pages: Math.ceil(proposals.length / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error getting proposals:', error);
    res.status(500).json({ error: '获取提案列表失败' });
  }
});

/**
 * 创建新提案
 */
router.post('/proposals', (req, res) => {
  try {
    const { 
      title, 
      description, 
      type = 'text', 
      proposer, 
      deposit,
      privateKey
    } = req.body;
    
    if (!title || !description || !proposer || !deposit || !privateKey) {
      return res.status(400).json({ error: '请提供所有必要的提案信息' });
    }
    
    if (!isValidAddress(proposer)) {
      return res.status(400).json({ error: '无效的提案者地址' });
    }
    
    if (deposit < config.GOVERNANCE.MIN_DEPOSIT) {
      return res.status(400).json({ 
        error: `押金不足，最小要求: ${config.GOVERNANCE.MIN_DEPOSIT}` 
      });
    }
    
    const blockchain = req.app.locals.blockchain;
    const wallets = req.app.locals.wallets;
    
    // 检查钱包认证
    const wallet = wallets.get(proposer);
    if (!wallet || wallet.getPrivateKey() !== privateKey) {
      return res.status(401).json({ error: '钱包认证失败' });
    }
    
    // 检查余额
    const balance = blockchain.getBalanceOfAddress(proposer);
    if (balance < deposit) {
      return res.status(400).json({ error: '余额不足支付押金' });
    }
    
    // 创建提案
    const proposalId = generateRandomId(8);
    const proposal = {
      id: proposalId,
      title,
      description,
      type,
      proposer,
      status: 'deposit_period',
      submitTime: getCurrentTimestamp(),
      votingStartTime: null,
      votingEndTime: null,
      deposit,
      totalDeposit: deposit,
      yesVotes: 0,
      noVotes: 0,
      abstainVotes: 0,
      vetoVotes: 0,
      totalVotingPower: 0
    };
    
    blockchain.proposals.set(proposalId, proposal);
    
    // 扣除押金
    const currentBalance = blockchain.getBalanceOfAddress(proposer);
    blockchain.balances.set(proposer, currentBalance - deposit);
    
    // 如果押金足够，直接进入投票期
    if (deposit >= config.GOVERNANCE.MIN_DEPOSIT) {
      proposal.status = 'voting_period';
      proposal.votingStartTime = getCurrentTimestamp();
      proposal.votingEndTime = getCurrentTimestamp() + config.GOVERNANCE.VOTING_PERIOD;
    }
    
    res.json({
      message: '提案创建成功',
      proposal
    });
    
    logger.info(`新提案创建: ${proposalId}`);
  } catch (error) {
    logger.error('Error creating proposal:', error);
    res.status(500).json({ error: '创建提案失败' });
  }
});

/**
 * 获取提案详情
 */
router.get('/proposals/:proposalId', (req, res) => {
  try {
    const { proposalId } = req.params;
    const blockchain = req.app.locals.blockchain;
    
    const proposal = blockchain.proposals.get(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: '提案不存在' });
    }
    
    // 获取投票信息
    const votes = blockchain.votes.get(proposalId) || new Map();
    const voteDetails = Array.from(votes.entries()).map(([address, vote]) => ({
      voter: address,
      option: vote.option,
      votingPower: vote.votingPower,
      timestamp: vote.timestamp
    }));
    
    res.json({
      ...proposal,
      votes: voteDetails,
      totalVotes: votes.size
    });
  } catch (error) {
    logger.error('Error getting proposal details:', error);
    res.status(500).json({ error: '获取提案详情失败' });
  }
});

/**
 * 对提案投票
 */
router.post('/proposals/:proposalId/vote', (req, res) => {
  try {
    const { proposalId } = req.params;
    const { voterAddress, option, privateKey } = req.body;
    
    if (!voterAddress || !option || !privateKey) {
      return res.status(400).json({ error: '请提供投票者地址、投票选项和私钥' });
    }
    
    if (!['yes', 'no', 'abstain', 'veto'].includes(option)) {
      return res.status(400).json({ error: '无效的投票选项' });
    }
    
    const blockchain = req.app.locals.blockchain;
    const wallets = req.app.locals.wallets;
    
    const proposal = blockchain.proposals.get(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: '提案不存在' });
    }
    
    if (proposal.status !== 'voting_period') {
      return res.status(400).json({ error: '提案不在投票期内' });
    }
    
    // 检查投票期是否结束
    if (getCurrentTimestamp() > proposal.votingEndTime) {
      return res.status(400).json({ error: '投票期已结束' });
    }
    
    // 检查钱包认证
    const wallet = wallets.get(voterAddress);
    if (!wallet || wallet.getPrivateKey() !== privateKey) {
      return res.status(401).json({ error: '钱包认证失败' });
    }
    
    // 检查是否已投票
    const votes = blockchain.votes.get(proposalId) || new Map();
    if (votes.has(voterAddress)) {
      return res.status(400).json({ error: '您已经为该提案投过票' });
    }
    
    // 创建投票交易
    const transaction = Transaction.createVote(voterAddress, proposalId, option);
    
    const currentNonce = blockchain.nonces.get(voterAddress) || 0;
    transaction.nonce = currentNonce + 1;
    
    transaction.signTransaction(privateKey);
    blockchain.addTransaction(transaction);
    
    // 统计投票
    const votingPower = blockchain.getVotingPower(voterAddress);
    const vote = {
      option,
      votingPower,
      timestamp: getCurrentTimestamp()
    };
    
    if (!blockchain.votes.has(proposalId)) {
      blockchain.votes.set(proposalId, new Map());
    }
    blockchain.votes.get(proposalId).set(voterAddress, vote);
    
    // 更新提案投票统计
    switch (option) {
      case 'yes':
        proposal.yesVotes += votingPower;
        break;
      case 'no':
        proposal.noVotes += votingPower;
        break;
      case 'abstain':
        proposal.abstainVotes += votingPower;
        break;
      case 'veto':
        proposal.vetoVotes += votingPower;
        break;
    }
    proposal.totalVotingPower += votingPower;
    
    res.json({
      message: '投票成功',
      vote,
      transaction: transaction.getSummary()
    });
    
    logger.info(`投票: ${voterAddress} -> 提案 ${proposalId}, 选项: ${option}`);
  } catch (error) {
    logger.error('Error voting on proposal:', error);
    res.status(500).json({ error: '投票失败' });
  }
});

/**
 * 为提案增加押金
 */
router.post('/proposals/:proposalId/deposit', (req, res) => {
  try {
    const { proposalId } = req.params;
    const { depositorAddress, amount, privateKey } = req.body;
    
    if (!depositorAddress || !amount || !privateKey) {
      return res.status(400).json({ error: '请提供押金者地址、金额和私钥' });
    }
    
    const blockchain = req.app.locals.blockchain;
    const wallets = req.app.locals.wallets;
    
    const proposal = blockchain.proposals.get(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: '提案不存在' });
    }
    
    if (proposal.status !== 'deposit_period') {
      return res.status(400).json({ error: '提案不在押金期内' });
    }
    
    // 检查钱包认证
    const wallet = wallets.get(depositorAddress);
    if (!wallet || wallet.getPrivateKey() !== privateKey) {
      return res.status(401).json({ error: '钱包认证失败' });
    }
    
    // 检查余额
    const balance = blockchain.getBalanceOfAddress(depositorAddress);
    if (balance < amount) {
      return res.status(400).json({ error: '余额不足' });
    }
    
    // 扣除押金
    const currentBalance = blockchain.getBalanceOfAddress(depositorAddress);
    blockchain.balances.set(depositorAddress, currentBalance - amount);
    
    // 更新提案押金
    proposal.totalDeposit += amount;
    
    // 如果达到最小押金，进入投票期
    if (proposal.totalDeposit >= config.GOVERNANCE.MIN_DEPOSIT && proposal.status === 'deposit_period') {
      proposal.status = 'voting_period';
      proposal.votingStartTime = getCurrentTimestamp();
      proposal.votingEndTime = getCurrentTimestamp() + config.GOVERNANCE.VOTING_PERIOD;
    }
    
    res.json({
      message: '押金成功',
      proposal: {
        id: proposal.id,
        totalDeposit: proposal.totalDeposit,
        status: proposal.status
      }
    });
    
    logger.info(`提案押金: ${depositorAddress} -> 提案 ${proposalId}, 金额: ${amount}`);
  } catch (error) {
    logger.error('Error depositing to proposal:', error);
    res.status(500).json({ error: '押金失败' });
  }
});

/**
 * 获取治理统计
 */
router.get('/stats', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    
    const proposals = Array.from(blockchain.proposals.values());
    const activeProposals = proposals.filter(p => p.status === 'voting_period');
    const passedProposals = proposals.filter(p => p.status === 'passed');
    const rejectedProposals = proposals.filter(p => p.status === 'rejected');
    
    // 计算投票参与率
    let totalVotingPower = 0;
    let totalParticipation = 0;
    
    for (const proposal of activeProposals) {
      totalVotingPower += proposal.totalVotingPower;
    }
    
    // 获取网络总投票权重
    const networkVotingPower = blockchain.totalSupply; // 简化版本
    const participationRate = networkVotingPower > 0 ? 
      (totalVotingPower / networkVotingPower * 100).toFixed(2) + '%' : '0%';
    
    res.json({
      totalProposals: proposals.length,
      activeProposals: activeProposals.length,
      passedProposals: passedProposals.length,
      rejectedProposals: rejectedProposals.length,
      depositProposals: proposals.filter(p => p.status === 'deposit_period').length,
      participationRate,
      governance: {
        minDeposit: config.GOVERNANCE.MIN_DEPOSIT,
        votingPeriod: config.GOVERNANCE.VOTING_PERIOD,
        quorum: config.GOVERNANCE.QUORUM,
        threshold: config.GOVERNANCE.THRESHOLD,
        vetoThreshold: config.GOVERNANCE.VETO_THRESHOLD
      }
    });
  } catch (error) {
    logger.error('Error getting governance stats:', error);
    res.status(500).json({ error: '获取治理统计失败' });
  }
});

module.exports = router;