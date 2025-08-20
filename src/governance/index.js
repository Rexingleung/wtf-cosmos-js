/**
 * WTF Cosmos JS - Governance Module Index
 * 治理模块导出
 */

const { Proposal, ProposalStatus, ProposalType } = require('./Proposal');
const { GovernanceManager, VoteOption } = require('./Voting');

module.exports = {
  Proposal,
  ProposalStatus,
  ProposalType,
  GovernanceManager,
  VoteOption
};