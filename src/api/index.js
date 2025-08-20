/**
 * WTF Cosmos JS - API Routes Index
 * API 路由总入口
 */

const blockchain = require('./blockchain');
const wallets = require('./wallets');
const transactions = require('./transactions');
const mining = require('./mining');
const validators = require('./validators');
const governance = require('./governance');

module.exports = {
  blockchain,
  wallets,
  transactions,
  mining,
  validators,
  governance,
};