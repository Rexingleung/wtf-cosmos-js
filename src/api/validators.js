/**
 * WTF Cosmos JS - Validators API
 * 验证者 API 路由
 */

const express = require('express');
const { logger } = require('../utils/logger');
const { Wallet } = require('../crypto');

const router = express.Router();

/**
 * 获取所有验证者
 */
router.get('/', (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain || !blockchain.validatorManager) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '验证者服务尚未初始化'
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let validators = blockchain.validatorManager.getAllValidators();

    // 按状态过滤
    if (status !== 'all') {
      validators = validators.filter(v => v.status === status);
    }

    const total = validators.length;
    const paginatedValidators = validators.slice(offset, offset + limitNum);

    res.json({
      validators: paginatedValidators.map(v => ({
        address: v.address,
        operatorAddress: v.operatorAddress,
        consensusPubKey: v.consensusPubKey,
        status: v.status,
        tokens: v.tokens,
        delegatorShares: v.delegatorShares,
        description: v.description,
        commission: v.commission,
        minSelfDelegation: v.minSelfDelegation,
        unbondingHeight: v.unbondingHeight,
        unbondingTime: v.unbondingTime,
        jailed: v.jailed,
        votingPower: v.getVotingPower?.() || 0,
        uptime: v.getUptime?.() || 0
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('获取验证者列表失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取验证者列表失败'
    });
  }
});

/**
 * 注册新验证者
 */
router.post('/', async (req, res) => {
  try {
    const {
      operatorAddress,
      consensusPubKey,
      selfDelegation,
      commission,
      minSelfDelegation,
      description,
      privateKey
    } = req.body;

    const blockchain = req.app.locals.blockchain;

    if (!blockchain || !blockchain.validatorManager) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '验证者服务尚未初始化'
      });
    }

    // 验证必需字段
    if (!operatorAddress || !consensusPubKey || !selfDelegation || !privateKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '缺少必需字段: operatorAddress, consensusPubKey, selfDelegation, privateKey'
      });
    }

    // 验证自委托金额
    if (selfDelegation < (minSelfDelegation || 1000)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '自委托金额不足'
      });
    }

    // 检查余额
    const balance = blockchain.getBalance(operatorAddress);
    if (balance < selfDelegation) {
      return res.status(400).json({
        error: 'Insufficient Funds',
        message: `余额不足。当前余额: ${balance}, 需要: ${selfDelegation}`
      });
    }

    // 检查验证者是否已存在
    if (blockchain.validatorManager.getValidator(operatorAddress)) {
      return res.status(409).json({
        error: 'Conflict',
        message: '验证者已存在'
      });
    }

    // 创建验证者
    const validatorInfo = {
      operatorAddress,
      consensusPubKey,
      selfDelegation,
      commission: commission || { rate: 0.1, maxRate: 0.2, maxChangeRate: 0.01 },
      minSelfDelegation: minSelfDelegation || 1000,
      description: description || { moniker: 'Unknown' }
    };

    const validator = blockchain.validatorManager.createValidator(validatorInfo);

    // 扣除自委托金额
    blockchain.balances.set(operatorAddress, balance - selfDelegation);

    logger.info('创建验证者', {
      operatorAddress,
      selfDelegation,
      commission: validatorInfo.commission
    });

    res.status(201).json({
      message: '验证者注册成功',
      validator: {
        address: validator.address,
        operatorAddress: validator.operatorAddress,
        status: validator.status,
        tokens: validator.tokens,
        commission: validator.commission,
        description: validator.description
      }
    });
  } catch (error) {
    logger.error('注册验证者失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '注册验证者失败'
    });
  }
});

/**
 * 获取单个验证者详情
 */
router.get('/:address', (req, res) => {
  try {
    const { address } = req.params;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain || !blockchain.validatorManager) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '验证者服务尚未初始化'
      });
    }

    const validator = blockchain.validatorManager.getValidator(address);
    if (!validator) {
      return res.status(404).json({
        error: 'Not Found',
        message: '验证者不存在'
      });
    }

    // 获取委托信息
    const delegations = blockchain.validatorManager.getDelegations(address);
    const totalDelegations = delegations.reduce((sum, d) => sum + d.shares, 0);

    res.json({
      validator: {
        address: validator.address,
        operatorAddress: validator.operatorAddress,
        consensusPubKey: validator.consensusPubKey,
        status: validator.status,
        tokens: validator.tokens,
        delegatorShares: validator.delegatorShares,
        description: validator.description,
        commission: validator.commission,
        minSelfDelegation: validator.minSelfDelegation,
        unbondingHeight: validator.unbondingHeight,
        unbondingTime: validator.unbondingTime,
        jailed: validator.jailed,
        votingPower: validator.getVotingPower?.() || 0,
        uptime: validator.getUptime?.() || 0
      },
      delegations: {
        total: totalDelegations,
        count: delegations.length,
        delegators: delegations.map(d => ({
          delegatorAddress: d.delegatorAddress,
          shares: d.shares,
          balance: d.balance
        }))
      }
    });
  } catch (error) {
    logger.error('获取验证者详情失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取验证者详情失败'
    });
  }
});

/**
 * 委托代币给验证者
 */
router.post('/:address/delegate', async (req, res) => {
  try {
    const { address } = req.params;
    const { delegatorAddress, amount, privateKey } = req.body;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain || !blockchain.validatorManager) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '验证者服务尚未初始化'
      });
    }

    // 验证必需字段
    if (!delegatorAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '缺少必需字段: delegatorAddress, amount, privateKey'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '委托金额必须大于0'
      });
    }

    // 检查验证者是否存在
    const validator = blockchain.validatorManager.getValidator(address);
    if (!validator) {
      return res.status(404).json({
        error: 'Not Found',
        message: '验证者不存在'
      });
    }

    // 检查验证者状态
    if (validator.status !== 'bonded') {
      return res.status(400).json({
        error: 'Bad Request',
        message: '验证者当前不可委托'
      });
    }

    // 检查委托者余额
    const balance = blockchain.getBalance(delegatorAddress);
    if (balance < amount) {
      return res.status(400).json({
        error: 'Insufficient Funds',
        message: `余额不足。当前余额: ${balance}, 需要: ${amount}`
      });
    }

    // 执行委托
    const delegation = blockchain.validatorManager.delegate(
      delegatorAddress,
      address,
      amount
    );

    // 扣除委托者余额
    blockchain.balances.set(delegatorAddress, balance - amount);

    logger.info('委托代币', {
      delegator: delegatorAddress,
      validator: address,
      amount
    });

    res.json({
      message: '委托成功',
      delegation: {
        delegatorAddress,
        validatorAddress: address,
        shares: delegation.shares,
        balance: delegation.balance
      }
    });
  } catch (error) {
    logger.error('委托失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '委托失败'
    });
  }
});

/**
 * 取消委托
 */
router.post('/:address/undelegate', async (req, res) => {
  try {
    const { address } = req.params;
    const { delegatorAddress, amount, privateKey } = req.body;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain || !blockchain.validatorManager) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '验证者服务尚未初始化'
      });
    }

    // 验证必需字段
    if (!delegatorAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '缺少必需字段: delegatorAddress, amount, privateKey'
      });
    }

    // 检查验证者是否存在
    const validator = blockchain.validatorManager.getValidator(address);
    if (!validator) {
      return res.status(404).json({
        error: 'Not Found',
        message: '验证者不存在'
      });
    }

    // 检查委托是否存在
    const delegation = blockchain.validatorManager.getDelegation(delegatorAddress, address);
    if (!delegation || delegation.balance < amount) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '委托余额不足'
      });
    }

    // 执行取消委托
    const unbonding = blockchain.validatorManager.undelegate(
      delegatorAddress,
      address,
      amount
    );

    logger.info('取消委托', {
      delegator: delegatorAddress,
      validator: address,
      amount,
      completionTime: unbonding.completionTime
    });

    res.json({
      message: '取消委托成功',
      unbonding: {
        delegatorAddress,
        validatorAddress: address,
        entries: unbonding.entries.map(entry => ({
          balance: entry.balance,
          completionTime: entry.completionTime
        }))
      }
    });
  } catch (error) {
    logger.error('取消委托失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '取消委托失败'
    });
  }
});

/**
 * 重新委托
 */
router.post('/:srcAddress/redelegate/:dstAddress', async (req, res) => {
  try {
    const { srcAddress, dstAddress } = req.params;
    const { delegatorAddress, amount, privateKey } = req.body;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain || !blockchain.validatorManager) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '验证者服务尚未初始化'
      });
    }

    // 验证必需字段
    if (!delegatorAddress || !amount || !privateKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '缺少必需字段: delegatorAddress, amount, privateKey'
      });
    }

    // 检查源验证者和目标验证者
    const srcValidator = blockchain.validatorManager.getValidator(srcAddress);
    const dstValidator = blockchain.validatorManager.getValidator(dstAddress);

    if (!srcValidator || !dstValidator) {
      return res.status(404).json({
        error: 'Not Found',
        message: '验证者不存在'
      });
    }

    if (srcAddress === dstAddress) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '源验证者和目标验证者不能相同'
      });
    }

    // 检查委托余额
    const delegation = blockchain.validatorManager.getDelegation(delegatorAddress, srcAddress);
    if (!delegation || delegation.balance < amount) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '委托余额不足'
      });
    }

    // 执行重新委托
    const redelegation = blockchain.validatorManager.redelegate(
      delegatorAddress,
      srcAddress,
      dstAddress,
      amount
    );

    logger.info('重新委托', {
      delegator: delegatorAddress,
      srcValidator: srcAddress,
      dstValidator: dstAddress,
      amount
    });

    res.json({
      message: '重新委托成功',
      redelegation: {
        delegatorAddress,
        srcValidatorAddress: srcAddress,
        dstValidatorAddress: dstAddress,
        entries: redelegation.entries.map(entry => ({
          balance: entry.balance,
          completionTime: entry.completionTime
        }))
      }
    });
  } catch (error) {
    logger.error('重新委托失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '重新委托失败'
    });
  }
});

/**
 * 获取验证者统计信息
 */
router.get('/stats/summary', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;

    if (!blockchain || !blockchain.validatorManager) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '验证者服务尚未初始化'
      });
    }

    const validators = blockchain.validatorManager.getAllValidators();
    
    const stats = {
      totalValidators: validators.length,
      bondedValidators: validators.filter(v => v.status === 'bonded').length,
      unbondingValidators: validators.filter(v => v.status === 'unbonding').length,
      unbondedValidators: validators.filter(v => v.status === 'unbonded').length,
      jailedValidators: validators.filter(v => v.jailed).length,
      totalStake: validators.reduce((sum, v) => sum + v.tokens, 0),
      averageCommission: validators.length > 0 ? 
        validators.reduce((sum, v) => sum + (v.commission.rate || 0), 0) / validators.length : 0,
      totalDelegators: blockchain.validatorManager.getAllDelegations().length
    };

    res.json(stats);
  } catch (error) {
    logger.error('获取验证者统计失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取验证者统计失败'
    });
  }
});

/**
 * 获取委托者的所有委托
 */
router.get('/delegations/:delegatorAddress', (req, res) => {
  try {
    const { delegatorAddress } = req.params;
    const blockchain = req.app.locals.blockchain;

    if (!blockchain || !blockchain.validatorManager) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: '验证者服务尚未初始化'
      });
    }

    const delegations = blockchain.validatorManager.getDelegatorDelegations(delegatorAddress);
    const unbondings = blockchain.validatorManager.getDelegatorUnbondings(delegatorAddress);
    const redelegations = blockchain.validatorManager.getDelegatorRedelegations(delegatorAddress);

    const totalDelegated = delegations.reduce((sum, d) => sum + d.balance, 0);
    const totalUnbonding = unbondings.reduce((sum, u) => 
      sum + u.entries.reduce((entrySum, entry) => entrySum + entry.balance, 0), 0
    );

    res.json({
      delegatorAddress,
      summary: {
        totalDelegated,
        totalUnbonding,
        totalValidators: delegations.length
      },
      delegations: delegations.map(d => ({
        validatorAddress: d.validatorAddress,
        shares: d.shares,
        balance: d.balance
      })),
      unbondings: unbondings.map(u => ({
        validatorAddress: u.validatorAddress,
        entries: u.entries.map(entry => ({
          balance: entry.balance,
          completionTime: entry.completionTime
        }))
      })),
      redelegations: redelegations.map(r => ({
        srcValidatorAddress: r.srcValidatorAddress,
        dstValidatorAddress: r.dstValidatorAddress,
        entries: r.entries.map(entry => ({
          balance: entry.balance,
          completionTime: entry.completionTime
        }))
      }))
    });
  } catch (error) {
    logger.error('获取委托者信息失败', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取委托者信息失败'
    });
  }
});

module.exports = router;