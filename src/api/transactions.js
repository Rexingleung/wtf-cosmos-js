/**
 * WTF Cosmos JS - Transactions API
 * 交易 API 路由
 */

const express = require('express');
const { logger } = require('../utils/logger');
const { Transaction } = require('../blockchain');
const { Wallet } = require('../crypto');

const router = express.Router();

/**
 * 获取交易池状态
 */
router.get('/pool', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    
    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    const poolInfo = {
      pendingTransactions: blockchain.pendingTransactions.length,
      transactions: blockchain.pendingTransactions.map(tx => ({
        hash: tx.hash,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        amount: tx.amount,
        fee: tx.fee,
        timestamp: tx.timestamp,
        type: tx.type
      }))
    };

    res.json(poolInfo);
  } catch (error) {
    logger.error('获取交易池失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取交易池信息失败'
    });
  }
});

/**
 * 创建新交易
 */
router.post('/', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, fee = 1, privateKey, type = 'transfer' } = req.body;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    // 验证必需字段
    if (!fromAddress || !toAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '缺少必需字段: fromAddress, toAddress, amount, privateKey'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '交易金额必须大于0'
      });
    }

    // 检查余额
    const senderBalance = blockchain.getBalance(fromAddress);
    if (senderBalance < amount + fee) {
      return res.status(400).json({
        error: 'Insufficient Funds',
        message: `余额不足。当前余额: ${senderBalance}, 需要: ${amount + fee}`
      });
    }

    // 创建交易
    const transaction = new Transaction(fromAddress, toAddress, amount, fee, type);
    
    // 使用私钥签名
    const wallet = new Wallet();
    wallet.privateKey = privateKey;
    transaction.signTransaction(wallet.keyPair);

    // 验证交易
    if (!transaction.isValid()) {
      return res.status(400).json({
        error: 'Invalid Transaction',
        message: '交易签名无效'
      });
    }

    // 添加到交易池
    const success = blockchain.addTransaction(transaction);
    if (!success) {
      return res.status(400).json({
        error: 'Transaction Rejected',
        message: '交易被拒绝'
      });
    }

    logger.info('创建交易', {
      hash: transaction.hash,
      from: fromAddress,
      to: toAddress,
      amount,
      fee
    });

    res.status(201).json({
      message: '交易创建成功',
      transaction: {
        hash: transaction.hash,
        fromAddress: transaction.fromAddress,
        toAddress: transaction.toAddress,
        amount: transaction.amount,
        fee: transaction.fee,
        timestamp: transaction.timestamp,
        type: transaction.type
      }
    });
  } catch (error) {
    logger.error('创建交易失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '创建交易失败'
    });
  }
});

/**
 * 根据哈希获取交易
 */
router.get('/:hash', (req, res) => {
  try {
    const { hash } = req.params;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    // 在交易池中查找
    const pendingTx = blockchain.pendingTransactions.find(tx => tx.hash === hash);
    if (pendingTx) {
      return res.json({
        transaction: pendingTx,
        status: 'pending',
        confirmations: 0
      });
    }

    // 在区块链中查找
    for (let i = 0; i < blockchain.chain.length; i++) {
      const block = blockchain.chain[i];
      const transaction = block.transactions.find(tx => tx.hash === hash);
      
      if (transaction) {
        return res.json({
          transaction: {
            ...transaction,
            blockIndex: block.index,
            blockHash: block.hash,
            blockTimestamp: block.timestamp
          },
          status: 'confirmed',
          confirmations: blockchain.chain.length - block.index
        });
      }
    }

    res.status(404).json({
      error: 'Not Found',
      message: '交易不存在'
    });
  } catch (error) {
    logger.error('获取交易失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取交易失败'
    });
  }
});

/**
 * 获取账户交易历史
 */
router.get('/address/:address', (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // 获取交易历史
    let transactions = blockchain.getTransactionHistory(address);

    // 按类型过滤
    if (type) {
      transactions = transactions.filter(tx => tx.type === type);
    }

    const total = transactions.length;
    const paginatedTransactions = transactions.slice(offset, offset + limitNum);

    res.json({
      address,
      transactions: paginatedTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('获取交易历史失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取交易历史失败'
    });
  }
});

/**
 * 批量创建交易
 */
router.post('/batch', async (req, res) => {
  try {
    const { transactions, privateKey } = req.body;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '无效的交易数组'
      });
    }

    if (transactions.length > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '批量交易数量不能超过100个'
      });
    }

    const results = [];
    const wallet = new Wallet();
    wallet.privateKey = privateKey;

    for (const txData of transactions) {
      try {
        const { fromAddress, toAddress, amount, fee = 1, type = 'transfer' } = txData;

        // 验证必需字段
        if (!fromAddress || !toAddress || !amount) {
          results.push({
            success: false,
            error: '缺少必需字段',
            txData
          });
          continue;
        }

        // 检查余额
        const senderBalance = blockchain.getBalance(fromAddress);
        if (senderBalance < amount + fee) {
          results.push({
            success: false,
            error: '余额不足',
            txData
          });
          continue;
        }

        // 创建和签名交易
        const transaction = new Transaction(fromAddress, toAddress, amount, fee, type);
        transaction.signTransaction(wallet.keyPair);

        // 添加到交易池
        const success = blockchain.addTransaction(transaction);
        
        results.push({
          success,
          hash: success ? transaction.hash : null,
          error: success ? null : '交易被拒绝',
          txData
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          txData
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      message: `批量交易处理完成，成功: ${successCount}/${transactions.length}`,
      results
    });
  } catch (error) {
    logger.error('批量创建交易失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '批量创建交易失败'
    });
  }
});

/**
 * 获取交易统计信息
 */
router.get('/stats/summary', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    // 计算交易统计
    let totalTransactions = 0;
    let totalVolume = 0;
    let totalFees = 0;
    const transactionTypes = {};

    for (const block of blockchain.chain) {
      for (const transaction of block.transactions) {
        totalTransactions++;
        totalVolume += transaction.amount;
        totalFees += transaction.fee;
        
        const type = transaction.type || 'transfer';
        transactionTypes[type] = (transactionTypes[type] || 0) + 1;
      }
    }

    // 计算平均值
    const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
    const averageFee = totalTransactions > 0 ? totalFees / totalTransactions : 0;

    // 最近24小时的交易数量
    const oneDayAgo = Date.now() - 86400000;
    let recentTransactions = 0;
    
    for (const block of blockchain.chain) {
      if (block.timestamp > oneDayAgo) {
        recentTransactions += block.transactions.length;
      }
    }

    res.json({
      totalTransactions,
      pendingTransactions: blockchain.pendingTransactions.length,
      totalVolume,
      totalFees,
      averageTransactionValue,
      averageFee,
      recentTransactions24h: recentTransactions,
      transactionTypes
    });
  } catch (error) {
    logger.error('获取交易统计失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取交易统计失败'
    });
  }
});

/**
 * 估算交易费用
 */
router.post('/estimate-fee', (req, res) => {
  try {
    const { fromAddress, toAddress, amount, priority = 'normal' } = req.body;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    // 简化的费用估算逻辑
    let baseFee = 1;
    
    // 根据交易池拥堵程度调整费用
    const poolSize = blockchain.pendingTransactions.length;
    if (poolSize > 100) {
      baseFee *= 2;
    } else if (poolSize > 50) {
      baseFee *= 1.5;
    }

    // 根据优先级调整费用
    const priorityMultipliers = {
      low: 0.5,
      normal: 1,
      high: 2,
      urgent: 5
    };

    const estimatedFee = baseFee * (priorityMultipliers[priority] || 1);

    res.json({
      estimatedFee: Math.ceil(estimatedFee),
      baseFee,
      priority,
      poolSize,
      recommendation: poolSize > 50 ? 'high' : 'normal'
    });
  } catch (error) {
    logger.error('估算交易费用失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '估算交易费用失败'
    });
  }
});

module.exports = router;