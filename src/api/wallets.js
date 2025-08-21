/**
 * WTF Cosmos JS - Wallets API
 * 钱包 API 路由
 */

const express = require('express');
const Wallet = require('../crypto/Wallet');
const { logger } = require('../utils/logger');
const { isValidAddress } = require('../utils/helpers');
const router = express.Router();

/**
 * 创建新钱包
 */
router.post('/', (req, res) => {
  try {
    const wallet = new Wallet();
    const wallets = req.app.locals.wallets;
    const blockchain = req.app.locals.blockchain;
    // 存储钱包
    
    wallets.set(wallet.address, wallet);
    blockchain.setBalance(wallet.address);
    const senderBalance = blockchain.getBalance(wallet.address);
    res.json({
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.getPrivateKey(),
      mnemonic: wallet.mnemonic,
      message: '请妥善保管您的私钥和助记词！'
    });
    
    logger.info(`新钱包创建: ${wallet.address}`);
  } catch (error) {
    logger.error('Error creating wallet:', error);
    res.status(500).json({ error: '创建钱包失败' });
  }
});

/**
 * 从私钥导入钱包
 */
router.post('/import', (req, res) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: '请提供私钥' });
    }
    
    const wallet = Wallet.fromPrivateKey(privateKey);
    const wallets = req.app.locals.wallets;
    
    // 存储钱包
    wallets.set(wallet.address, wallet);
    
    res.json({
      address: wallet.address,
      publicKey: wallet.publicKey,
      message: '钱包导入成功'
    });
    
    logger.info(`钱包导入: ${wallet.address}`);
  } catch (error) {
    logger.error('Error importing wallet:', error);
    res.status(400).json({ error: '导入钱包失败，请检查私钥格式' });
  }
});

/**
 * 获取钱包信息
 */
router.get('/:address', (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: '无效的地址格式' });
    }
    
    const blockchain = req.app.locals.blockchain;
    const wallets = req.app.locals.wallets;
    
    const balance = blockchain.getBalanceOfAddress(address);
    const wallet = wallets.get(address);
    
    const walletInfo = {
      address,
      balance,
      exists: wallet ? true : false
    };
    
    if (wallet) {
      walletInfo.publicKey = wallet.publicKey;
      walletInfo.createdAt = wallet.createdAt;
    }
    
    res.json(walletInfo);
  } catch (error) {
    logger.error('Error getting wallet info:', error);
    res.status(500).json({ error: '获取钱包信息失败' });
  }
});

/**
 * 获取钱包余额
 */
router.get('/:address/balance', (req, res) => {
  try {
    const { address } = req.params;
    
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: '无效的地址格式' });
    }
    
    const blockchain = req.app.locals.blockchain;
    const balance = blockchain.getBalanceOfAddress(address);
    
    res.json({
      address,
      balance,
      denom: 'wtfcoin'
    });
  } catch (error) {
    logger.error('Error getting balance:', error);
    res.status(500).json({ error: '获取余额失败' });
  }
});

/**
 * 获取钱包交易历史
 */
router.get('/:address/transactions', (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: '无效的地址格式' });
    }
    
    const blockchain = req.app.locals.blockchain;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    const transactions = blockchain.getAddressTransactions(address, limitNum * pageNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);
    
    res.json({
      address,
      transactions: paginatedTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: transactions.length,
        pages: Math.ceil(transactions.length / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error getting transaction history:', error);
    res.status(500).json({ error: '获取交易历史失败' });
  }
});

/**
 * 获取所有钱包列表
 */
router.get('/', (req, res) => {
  try {
    const wallets = req.app.locals.wallets;
    const blockchain = req.app.locals.blockchain;
    
    const walletList = Array.from(wallets.values()).map(wallet => {
      const balance = blockchain.getBalanceOfAddress(wallet.address);
      return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        balance,
        createdAt: wallet.createdAt || Date.now()
      };
    });
    
    res.json({
      wallets: walletList,
      count: walletList.length
    });
  } catch (error) {
    logger.error('Error getting wallet list:', error);
    res.status(500).json({ error: '获取钱包列表失败' });
  }
});

/**
 * 验证钱包签名
 */
router.post('/:address/verify', (req, res) => {
  try {
    const { address } = req.params;
    const { message, signature } = req.body;
    
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: '无效的地址格式' });
    }
    
    if (!message || !signature) {
      return res.status(400).json({ error: '请提供消息和签名' });
    }
    
    const wallets = req.app.locals.wallets;
    const wallet = wallets.get(address);
    
    if (!wallet) {
      return res.status(404).json({ error: '钱包不存在' });
    }
    
    const isValid = Wallet.verifySignature(message, signature, wallet.publicKey);
    
    res.json({
      address,
      message,
      signature,
      valid: isValid
    });
  } catch (error) {
    logger.error('Error verifying signature:', error);
    res.status(500).json({ error: '验证签名失败' });
  }
});

module.exports = router;