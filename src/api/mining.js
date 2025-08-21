/**
 * WTF Cosmos JS - Mining API
 * 挖矿 API 路由
 */

const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * 获取挖矿状态
 */
router.get('/status', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    const status = {
      isMining: blockchain.isMining,
      currentMiner: blockchain.currentMiner,
      difficulty: blockchain.difficulty,
      pendingTransactions: blockchain.pendingTransactions.length,
      lastBlockTime: blockchain.getLatestBlock().timestamp,
      averageBlockTime: blockchain.stats.averageBlockTime,
      hashRate: blockchain.stats.hashRate,
      totalBlocks: blockchain.chain.length,
      miningReward: blockchain.miningReward
    };

    res.json(status);
  } catch (error) {
    logger.error('获取挖矿状态失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取挖矿状态失败'
    });
  }
});

/**
 * 开始挖矿
 */
router.post('/start', async (req, res) => {
  try {
    const { minerAddress } = req.body;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    if (!minerAddress) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '缺少 minerAddress 参数'
      });
    }

    if (blockchain.isMining) {
      return res.status(409).json({
        error: 'Conflict',
        message: '已经在挖矿中',
        currentMiner: blockchain.currentMiner
      });
    }

    if (blockchain.pendingTransactions.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '没有待处理的交易'
      });
    }

    // 异步开始挖矿
    setImmediate(async () => {
      try {
        const newBlock = await blockchain.minePendingTransactions(minerAddress);
        logger.info('挖矿完成', {
          blockIndex: newBlock.index,
          hash: newBlock.hash,
          miner: minerAddress,
          transactions: newBlock.transactions.length
        });
      } catch (error) {
        logger.error('挖矿失败1', { error: error.message, miner: minerAddress });
      }
    });

    res.json({
      message: '开始挖矿',
      minerAddress,
      difficulty: blockchain.difficulty,
      pendingTransactions: blockchain.pendingTransactions.length
    });
  } catch (error) {
    logger.error('开始挖矿失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '开始挖矿失败'
    });
  }
});

/**
 * 停止挖矿
 */
router.post('/stop', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    if (!blockchain.isMining) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '当前没有在挖矿'
      });
    }

    // 注意：实际实现中需要更复杂的挖矿停止逻辑
    blockchain.isMining = false;
    const stoppedMiner = blockchain.currentMiner;
    blockchain.currentMiner = null;

    logger.info('停止挖矿', { miner: stoppedMiner });

    res.json({
      message: '停止挖矿',
      stoppedMiner
    });
  } catch (error) {
    logger.error('停止挖矿失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '停止挖矿失败'
    });
  }
});

/**
 * 获取挖矿统计信息
 */
router.get('/stats', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    // 计算挖矿统计
    const miners = new Map();
    let totalRewards = 0;

    for (const block of blockchain.chain.slice(1)) { // 跳过创世区块
      const miner = block.validator || block.miner;
      if (miner) {
        const minerStats = miners.get(miner) || {
          address: miner,
          blocksMinced: 0,
          totalRewards: 0,
          lastBlockTime: 0
        };
        
        minerStats.blocksMinced++;
        minerStats.totalRewards += blockchain.miningReward;
        minerStats.lastBlockTime = Math.max(minerStats.lastBlockTime, block.timestamp);
        
        miners.set(miner, minerStats);
        totalRewards += blockchain.miningReward;
      }
    }

    // 按挖出的区块数排序
    const topMiners = Array.from(miners.values())
      .sort((a, b) => b.blocksMinced - a.blocksMinced)
      .slice(0, 10);

    // 计算网络算力
    const recentBlocks = blockchain.chain.slice(-10);
    let totalHashRate = 0;
    
    if (recentBlocks.length > 1) {
      const timeSpan = recentBlocks[recentBlocks.length - 1].timestamp - recentBlocks[0].timestamp;
      const avgBlockTime = timeSpan / (recentBlocks.length - 1);
      totalHashRate = Math.pow(2, blockchain.difficulty) / (avgBlockTime / 1000);
    }

    res.json({
      networkStats: {
        totalMiners: miners.size,
        totalBlocksMinced: blockchain.chain.length - 1,
        totalRewards,
        currentDifficulty: blockchain.difficulty,
        averageBlockTime: blockchain.stats.averageBlockTime,
        estimatedHashRate: totalHashRate,
        miningReward: blockchain.miningReward
      },
      topMiners,
      currentStatus: {
        isMining: blockchain.isMining,
        currentMiner: blockchain.currentMiner,
        pendingTransactions: blockchain.pendingTransactions.length
      }
    });
  } catch (error) {
    logger.error('获取挖矿统计失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取挖矿统计失败'
    });
  }
});

/**
 * 获取挖矿收益预估
 */
router.get('/estimate/:address', (req, res) => {
  try {
    const { address } = req.params;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    // 计算该地址的历史挖矿数据
    let blocksMinced = 0;
    let totalRewards = 0;
    let lastMiningTime = 0;

    for (const block of blockchain.chain) {
      if (block.validator === address || block.miner === address) {
        blocksMinced++;
        totalRewards += blockchain.miningReward;
        lastMiningTime = Math.max(lastMiningTime, block.timestamp);
      }
    }

    // 计算挖矿成功率
    const totalBlocks = blockchain.chain.length - 1; // 排除创世区块
    const successRate = totalBlocks > 0 ? blocksMinced / totalBlocks : 0;

    // 预估未来收益
    const averageBlockTime = blockchain.stats.averageBlockTime || 60000;
    const blocksPerDay = 86400000 / averageBlockTime;
    const estimatedDailyBlocks = blocksPerDay * successRate;
    const estimatedDailyRewards = estimatedDailyBlocks * blockchain.miningReward;

    res.json({
      address,
      historicalData: {
        blocksMinced,
        totalRewards,
        successRate,
        lastMiningTime
      },
      estimates: {
        dailyBlocks: estimatedDailyBlocks,
        dailyRewards: estimatedDailyRewards,
        weeklyRewards: estimatedDailyRewards * 7,
        monthlyRewards: estimatedDailyRewards * 30
      },
      networkInfo: {
        currentDifficulty: blockchain.difficulty,
        miningReward: blockchain.miningReward,
        averageBlockTime: blockchain.stats.averageBlockTime,
        pendingTransactions: blockchain.pendingTransactions.length
      }
    });
  } catch (error) {
    logger.error('获取挖矿收益预估失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取挖矿收益预估失败'
    });
  }
});

/**
 * 获取当前挖矿难度信息
 */
router.get('/difficulty', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    // 计算难度调整历史
    const difficultyHistory = [];
    let currentDifficulty = blockchain.difficulty;
    
    // 模拟难度调整历史（实际应该从区块数据中获取）
    for (let i = Math.max(0, blockchain.chain.length - 100); i < blockchain.chain.length; i += 10) {
      difficultyHistory.push({
        blockHeight: i,
        difficulty: currentDifficulty,
        timestamp: blockchain.chain[Math.min(i, blockchain.chain.length - 1)]?.timestamp || Date.now()
      });
    }

    // 计算下次难度调整
    const nextAdjustmentBlock = Math.ceil(blockchain.chain.length / 10) * 10;
    const blocksUntilAdjustment = nextAdjustmentBlock - blockchain.chain.length;

    res.json({
      currentDifficulty: blockchain.difficulty,
      targetBlockTime: blockchain.blockTime,
      actualBlockTime: blockchain.stats.averageBlockTime,
      nextAdjustment: {
        atBlock: nextAdjustmentBlock,
        blocksRemaining: blocksUntilAdjustment,
        estimatedTime: blocksUntilAdjustment * blockchain.stats.averageBlockTime
      },
      difficultyHistory,
      hashRateEstimate: blockchain.stats.hashRate
    });
  } catch (error) {
    logger.error('获取挖矿难度信息失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取挖矿难度信息失败'
    });
  }
});

/**
 * 手动调整挖矿难度（仅开发模式）
 */
router.post('/difficulty', (req, res) => {
  try {
    const { difficulty } = req.body;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '区块链服务尚未初始化'
      });
    }

    // 仅在开发模式下允许手动调整难度
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '生产模式下不允许手动调整难度'
      });
    }

    if (typeof difficulty !== 'number' || difficulty < 1 || difficulty > 20) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '难度值必须在1-20之间'
      });
    }

    const oldDifficulty = blockchain.difficulty;
    blockchain.difficulty = difficulty;

    logger.info('手动调整挖矿难度', {
      oldDifficulty,
      newDifficulty: difficulty
    });

    res.json({
      message: '挖矿难度已调整',
      oldDifficulty,
      newDifficulty: difficulty,
      estimatedBlockTime: Math.pow(2, difficulty) * 1000 // 估算
    });
  } catch (error) {
    logger.error('调整挖矿难度失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '调整挖矿难度失败'
    });
  }
});

module.exports = router;