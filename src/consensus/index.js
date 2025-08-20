/**
 * WTF Cosmos JS - Consensus Module Index
 * 共识模块导出
 */

const { ProofOfWork } = require('./ProofOfWork');
const { ValidatorManager } = require('./Validator');

module.exports = {
  ProofOfWork,
  ValidatorManager
};