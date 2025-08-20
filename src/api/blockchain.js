/**
 * WTF Cosmos JS - Blockchain API
 * 区块链 API 路由
 */

const express = require('express');
const { logger } = require('../utils/logger');
const router = express.Router();

/**
 * 获取完整区块链信息
 */
router.get('/', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    
    res.json({
      chain: blockchain.chain.map(block => ({
        id: block.id,
        height: block.height,
        hash: block.hash,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
        transactionCount: block.transactionCount,
        validator: block.validator,
        nonce: block.nonce,
        difficulty: block.difficulty
      })),
      stats: blockchain.getStats(),
      network: {
        chainId: blockchain.chainId,
        totalSupply: blockchain.totalSupply,
        difficulty: blockchain.difficulty
      }
    });
  } catch (error) {
    logger.error('Error getting blockchain:', error);
    res.status(500).json({ error: '获取区块链信息失败' });
  }
});

/**
 * 获取所有区块
 */
router.get('/blocks', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const blocks = blockchain.chain
      .slice()
      .reverse() // 最新的在前
      .slice(startIndex, endIndex)
      .map(block => block.getStats());
    
    res.json({
      blocks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: blockchain.chain.length,
        pages: Math.ceil(blockchain.chain.length / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error getting blocks:', error);
    res.status(500).json({ error: '获取区块列表失败' });
  }
});

/**
 * 获取特定区块
 */
router.get('/blocks/:identifier', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const { identifier } = req.params;
    
    // 尝试按高度查找
    let block;
    if (/^\d+$/.test(identifier)) {
      block = blockchain.getBlock(parseInt(identifier));
    } else {
      // 按哈希或 ID 查找
      block = blockchain.getBlock(identifier);
    }
    
    if (!block) {
      return res.status(404).json({ error: '区块不存在' });
    }
    
    res.json({
      block: block.serialize(),
      stats: block.getStats()
    });
  } catch (error) {
    logger.error('Error getting block:', error);
    res.status(500).json({ error: '获取区块信息失败' });
  }
});

/**
 * 获取待处理交易
 */
router.get('/pending-transactions', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    
    const pendingTransactions = blockchain.pendingTransactions.map(tx => ({
      id: tx.id,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      amount: tx.amount,
      type: tx.type,
      fee: tx.fee,
      timestamp: tx.timestamp
    }));
    
    res.json({
      transactions: pendingTransactions,
      count: pendingTransactions.length
    });
  } catch (error) {
    logger.error('Error getting pending transactions:', error);
    res.status(500).json({ error: '获取待处理交易失败' });
  }
});

/**
 * 验证区块链完整性
 */
router.get('/validate', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const isValid = blockchain.isChainValid();
    
    res.json({
      valid: isValid,
      message: isValid ? '区块链验证通过' : '区块链验证失败',
      chainLength: blockchain.chain.length,
      latestBlock: blockchain.getLatestBlock().getStats()
    });
  } catch (error) {
    logger.error('Error validating blockchain:', error);
    res.status(500).json({ error: '验证区块链失败' });
  }
});

/**
 * 获取区块链统计信息
 */
router.get('/stats', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const stats = blockchain.getStats();
    
    res.json({
      ...stats,
      network: {
        totalSupply: blockchain.totalSupply,
        difficulty: blockchain.difficulty,
        blockTime: blockchain.blockTime
      }
    });
  } catch (error) {
    logger.error('Error getting blockchain stats:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

/**
 * 获取交易信息
 */
router.get('/transactions/:txId', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const { txId } = req.params;
    
    const transactionInfo = blockchain.getTransaction(txId);
    
    if (!transactionInfo) {
      return res.status(404).json({ error: '交易不存在' });
    }
    
    res.json(transactionInfo);
  } catch (error) {
    logger.error('Error getting transaction:', error);
    res.status(500).json({ error: '获取交易信息失败' });
  }
});

/**
 * 搜索区块或交易
 */
router.get('/search/:query', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const { query } = req.params;
    
    const results = {
      blocks: [],
      transactions: [],
      addresses: []
    };
    
    // 搜索区块
    if (/^\d+$/.test(query)) {
      const block = blockchain.getBlock(parseInt(query));
      if (block) {
        results.blocks.push(block.getStats());
      }
    } else {
      // 搜索哈希
      const block = blockchain.getBlock(query);
      if (block) {
        results.blocks.push(block.getStats());
      }
    }
    
    // 搜索交易
    const transaction = blockchain.getTransaction(query);
    if (transaction) {
      results.transactions.push(transaction);
    }
    
    // 搜索地址
    if (query.startsWith('wtf1')) {
      const balance = blockchain.getBalanceOfAddress(query);
      results.addresses.push({
        address: query,
        balance
      });
    }
    
    res.json({
      query,
      results,
      totalResults: results.blocks.length + results.transactions.length + results.addresses.length
    });
  } catch (error) {
    logger.error('Error searching:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

module.exports = router;