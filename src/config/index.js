/**
 * WTF Cosmos JS - Configuration Module
 * 应用程序配置管理
 */

const path = require('path');

// 加载环境变量
// require('dotenv').config();

const config = {
  // 服务器配置
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  HOST: process.env.HOST || 'localhost',

  // 区块链配置
  BLOCKCHAIN: {
    CHAIN_ID: process.env.CHAIN_ID || 'wtf-cosmos-1',
    GENESIS_TIME: process.env.GENESIS_TIME || new Date().toISOString(),
    BLOCK_TIME: parseInt(process.env.BLOCK_TIME, 10) || 5000, // 5秒
    MAX_BLOCK_SIZE: parseInt(process.env.MAX_BLOCK_SIZE, 10) || 1000000, // 1MB
    MAX_TX_SIZE: parseInt(process.env.MAX_TX_SIZE, 10) || 100000, // 100KB
    DIFFICULTY_ADJUSTMENT_INTERVAL: parseInt(process.env.DIFFICULTY_ADJUSTMENT_INTERVAL, 10) || 10,
    INITIAL_DIFFICULTY: parseInt(process.env.INITIAL_DIFFICULTY, 10) || 4,
  },

  // 网络配置
  NETWORK: {
    P2P_PORT: parseInt(process.env.P2P_PORT, 10) || 26656,
    RPC_PORT: parseInt(process.env.RPC_PORT, 10) || 26657,
    SEEDS: process.env.SEEDS ? process.env.SEEDS.split(',') : [],
    PERSISTENT_PEERS: process.env.PERSISTENT_PEERS ? process.env.PERSISTENT_PEERS.split(',') : [],
    MAX_PEERS: parseInt(process.env.MAX_PEERS, 10) || 50,
  },

  // 共识配置
  CONSENSUS: {
    TIMEOUT_PROPOSE: parseInt(process.env.TIMEOUT_PROPOSE, 10) || 3000,
    TIMEOUT_PREVOTE: parseInt(process.env.TIMEOUT_PREVOTE, 10) || 1000,
    TIMEOUT_PRECOMMIT: parseInt(process.env.TIMEOUT_PRECOMMIT, 10) || 1000,
    TIMEOUT_COMMIT: parseInt(process.env.TIMEOUT_COMMIT, 10) || 1000,
    SKIP_TIMEOUT_COMMIT: process.env.SKIP_TIMEOUT_COMMIT === 'true',
  },

  // 密码学配置
  CRYPTO: {
    SIGNATURE_ALGORITHM: process.env.SIGNATURE_ALGORITHM || 'secp256k1',
    HASH_ALGORITHM: process.env.HASH_ALGORITHM || 'sha256',
    ADDRESS_PREFIX: process.env.ADDRESS_PREFIX || 'cosmos',
  },

  // 数据库配置
  DATABASE: {
    TYPE: process.env.DB_TYPE || 'memory', // memory, file, mongodb
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT, 10) || 27017,
    NAME: process.env.DB_NAME || 'wtf_cosmos',
    USER: process.env.DB_USER || '',
    PASSWORD: process.env.DB_PASSWORD || '',
    DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
  },

  // 日志配置
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    FORMAT: process.env.LOG_FORMAT || 'json',
    OUTPUT: process.env.LOG_OUTPUT || 'file,console',
    MAX_SIZE: process.env.LOG_MAX_SIZE || '20m',
    MAX_FILES: process.env.LOG_MAX_FILES || '14d',
  },

  // API配置
  API: {
    RATE_LIMIT: {
      WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15分钟
      MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    },
    CORS: {
      ORIGIN: process.env.CORS_ORIGIN || '*',
      CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
    },
    PAGINATION: {
      DEFAULT_LIMIT: parseInt(process.env.DEFAULT_PAGINATION_LIMIT, 10) || 20,
      MAX_LIMIT: parseInt(process.env.MAX_PAGINATION_LIMIT, 10) || 100,
    },
  },

  // 验证器配置
  VALIDATOR: {
    MONIKER: process.env.VALIDATOR_MONIKER || 'wtf-cosmos-validator',
    WEBSITE: process.env.VALIDATOR_WEBSITE || '',
    DETAILS: process.env.VALIDATOR_DETAILS || 'WTF Cosmos JS Validator',
    COMMISSION_RATE: parseFloat(process.env.VALIDATOR_COMMISSION_RATE) || 0.1,
    COMMISSION_MAX_RATE: parseFloat(process.env.VALIDATOR_COMMISSION_MAX_RATE) || 0.2,
    COMMISSION_MAX_CHANGE_RATE: parseFloat(process.env.VALIDATOR_COMMISSION_MAX_CHANGE_RATE) || 0.01,
    MIN_SELF_DELEGATION: process.env.VALIDATOR_MIN_SELF_DELEGATION || '1000000',
  },

  // 安全配置
  SECURITY: {
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    LOCK_TIME: parseInt(process.env.LOCK_TIME, 10) || 2 * 60 * 60 * 1000, // 2小时
  },

  // 开发配置
  DEVELOPMENT: {
    HOT_RELOAD: process.env.HOT_RELOAD === 'true',
    DEBUG_MODE: process.env.DEBUG_MODE === 'true',
    MOCK_DATA: process.env.MOCK_DATA === 'true',
    PROFILING: process.env.PROFILING === 'true',
  },

  // 监控配置
  MONITORING: {
    METRICS_ENABLED: process.env.METRICS_ENABLED === 'true',
    METRICS_PORT: parseInt(process.env.METRICS_PORT, 10) || 9090,
    HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL, 10) || 30000, // 30秒
  },

  // 性能配置
  PERFORMANCE: {
    WORKER_THREADS: parseInt(process.env.WORKER_THREADS, 10) || require('os').cpus().length,
    MEMORY_LIMIT: process.env.MEMORY_LIMIT || '1gb',
    CPU_LIMIT: parseFloat(process.env.CPU_LIMIT) || 1.0,
  },
};

// 配置验证函数
function validateConfig() {
  const errors = [];

  // 验证端口范围
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  // 验证区块时间
  if (config.BLOCKCHAIN.BLOCK_TIME < 1000) {
    errors.push('BLOCK_TIME must be at least 1000ms');
  }

  // 验证难度调整间隔
  if (config.BLOCKCHAIN.DIFFICULTY_ADJUSTMENT_INTERVAL < 1) {
    errors.push('DIFFICULTY_ADJUSTMENT_INTERVAL must be at least 1');
  }

  // 验证最大对等节点数
  if (config.NETWORK.MAX_PEERS < 1) {
    errors.push('MAX_PEERS must be at least 1');
  }

  // 验证佣金比率
  if (config.VALIDATOR.COMMISSION_RATE < 0 || config.VALIDATOR.COMMISSION_RATE > 1) {
    errors.push('VALIDATOR_COMMISSION_RATE must be between 0 and 1');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// 获取环境特定配置
function getEnvironmentConfig() {
  const env = config.NODE_ENV;
  
  switch (env) {
    case 'production':
      return {
        ...config,
        LOGGING: {
          ...config.LOGGING,
          LEVEL: 'warn',
        },
        API: {
          ...config.API,
          CORS: {
            ...config.API.CORS,
            ORIGIN: process.env.CORS_ORIGIN || false, // 生产环境默认不允许所有来源
          },
        },
      };
    
    case 'test':
      return {
        ...config,
        PORT: 0, // 随机端口用于测试
        LOGGING: {
          ...config.LOGGING,
          LEVEL: 'error',
        },
        DATABASE: {
          ...config.DATABASE,
          TYPE: 'memory',
        },
      };
    
    case 'development':
    default:
      return {
        ...config,
        DEVELOPMENT: {
          ...config.DEVELOPMENT,
          DEBUG_MODE: true,
          HOT_RELOAD: true,
        },
      };
  }
}

// 获取最终配置
const finalConfig = getEnvironmentConfig();

// 验证配置
try {
  validateConfig();
} catch (error) {
  console.error('Configuration Error:', error.message);
  process.exit(1);
}

module.exports = finalConfig;