/**
 * WTF Cosmos JS - Source Index
 * 源码模块导出
 */

const { Blockchain, Block, Transaction } = require('./blockchain');
const { Wallet, KeyManager } = require('./crypto');
const { ProofOfWork, ValidatorManager } = require('./consensus');
const { GovernanceManager, Proposal, VoteOption } = require('./governance');
const { createServer, startServer } = require('./server');
const config = require('./config');
const { logger, helpers } = require('./utils');

module.exports = {
  // 区块链核心
  Blockchain,
  Block,
  Transaction,
  
  // 加密模块
  Wallet,
  KeyManager,
  
  // 共识机制
  ProofOfWork,
  ValidatorManager,
  
  // 治理模块
  GovernanceManager,
  Proposal,
  VoteOption,
  
  // 服务器
  createServer,
  startServer,
  
  // 配置和工具
  config,
  logger,
  helpers
};