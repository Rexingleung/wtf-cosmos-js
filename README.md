# WTF Cosmos JS - 区块链学习项目

[![Build Status](https://github.com/Rexingleung/wtf-cosmos-js/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/Rexingleung/wtf-cosmos-js/actions)
[![codecov](https://codecov.io/gh/Rexingleung/wtf-cosmos-js/branch/main/graph/badge.svg)](https://codecov.io/gh/Rexingleung/wtf-cosmos-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

> 🚀 用 JavaScript 构建的教育性区块链实现，灵感来自 Cosmos SDK

## 📋 项目状态

✅ **已完成的功能：**

### 🔗 区块链核心
- ✅ **完整区块链实现** - Blockchain.js 核心类
- ✅ **区块结构** - Block.js 区块定义
- ✅ **交易系统** - Transaction.js 交易处理
- ✅ **工作量证明** - ProofOfWork.js PoW 共识算法
- ✅ **验证者系统** - Validator.js 验证者管理

### 💰 代币与钱包
- ✅ **钱包实现** - Wallet.js 钱包管理
- ✅ **密钥管理** - KeyManager.js 密钥处理
- ✅ **数字签名** - ECDSA 签名验证
- ✅ **余额管理** - 账户余额跟踪

### 🗳️ 链上治理
- ✅ **提案系统** - Proposal.js 提案管理
- ✅ **投票机制** - Voting.js 投票处理
- ✅ **治理参数** - 可配置的治理参数
- ✅ **执行机制** - 提案自动执行

### 🌐 API 接口
- ✅ **区块链 API** - blockchain.js 路由
- ✅ **钱包 API** - wallets.js 路由
- ✅ **交易 API** - transactions.js 路由
- ✅ **挖矿 API** - mining.js 路由
- ✅ **验证者 API** - validators.js 路由
- ✅ **治理 API** - governance.js 路由

### 🖥️ 用户界面
- ✅ **Web 界面** - 响应式 HTML/CSS/JS 界面
- ✅ **实时数据** - 自动更新的仪表盘
- ✅ **交易管理** - 图形化交易操作
- ✅ **挖矿控制** - 可视化挖矿管理

### 🔧 工具与配置
- ✅ **配置系统** - 完整的环境配置
- ✅ **日志系统** - 结构化日志记录
- ✅ **工具函数** - 通用工具库
- ✅ **测试框架** - Jest 测试套件

## 🚀 快速开始

### 环境要求

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **4GB+ RAM**
- **1GB+ 可用磁盘空间**

### 安装和启动

```bash
# 1. 克隆项目
git clone https://github.com/Rexingleung/wtf-cosmos-js.git
cd wtf-cosmos-js

# 2. 自动设置（推荐）
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. 或手动安装
npm install
cp .env.example .env
mkdir -p logs data

# 4. 启动节点
npm start

# 或开发模式（支持热重载）
npm run dev
```

### 访问应用

- **🌐 Web 界面**: http://localhost:3000
- **🔗 API 接口**: http://localhost:3000/api
- **📚 API 文档**: http://localhost:3000/api

## 📚 使用指南

### 基础操作

#### 1. 创建钱包

```javascript
// 通过 API
const response = await fetch('/api/wallets', { method: 'POST' });
const wallet = await response.json();

// 通过 Web 界面
// 点击"创建新钱包"按钮
```

#### 2. 发送交易

```javascript
const transaction = {
  fromAddress: 'wtf1sender123...',
  toAddress: 'wtf1receiver456...',
  amount: 100,
  privateKey: 'your_private_key'
};

const response = await fetch('/api/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(transaction)
});
```

#### 3. 开始挖矿

```javascript
// 启动挖矿
await fetch('/api/mining/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ minerAddress: 'wtf1miner...' })
});
```

#### 4. 创建治理提案

```javascript
const proposal = {
  proposer: 'wtf1proposer...',
  title: '增加区块大小',
  description: '建议将最大区块大小从1MB增加到2MB',
  type: 'ParameterChange',
  initialDeposit: 1000,
  privateKey: 'proposer_private_key'
};

await fetch('/api/governance/proposals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(proposal)
});
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm run test:unit          # 单元测试
npm run test:integration   # 集成测试
npm run test:coverage      # 覆盖率测试

# 代码质量检查
npm run lint               # 代码检查
npm run lint:fix           # 自动修复
npm run format             # 代码格式化
```

## 🔧 配置

主要配置通过 `.env` 文件管理：

```bash
# 服务器配置
PORT=3000
HOST=localhost
NODE_ENV=development

# 区块链配置
BLOCKCHAIN_DIFFICULTY=4
MINING_REWARD=50
MAX_BLOCK_SIZE=1048576

# 验证者配置
MIN_VALIDATOR_STAKE=1000
UNBONDING_TIME=1814400000

# 治理配置
MIN_DEPOSIT=1000
VOTING_PERIOD=172800000
QUORUM=0.4
```

## 🏗️ 项目架构

```
wtf-cosmos-js/
├── src/
│   ├── blockchain/          # 区块链核心逻辑
│   │   ├── Block.js        # 区块定义
│   │   ├── Blockchain.js   # 区块链主类  ✅
│   │   └── Transaction.js  # 交易定义
│   ├── consensus/          # 共识机制
│   │   ├── ProofOfWork.js  # PoW 实现
│   │   └── Validator.js    # 验证者管理
│   ├── crypto/             # 加密模块
│   │   ├── Wallet.js       # 钱包实现
│   │   └── KeyManager.js   # 密钥管理
│   ├── governance/         # 治理模块  ✅
│   │   ├── Proposal.js     # 提案管理
│   │   └── Voting.js       # 投票机制
│   ├── api/                # API 路由  ✅
│   │   ├── blockchain.js   # 区块链 API
│   │   ├── transactions.js # 交易 API
│   │   ├── mining.js       # 挖矿 API
│   │   ├── wallets.js      # 钱包 API
│   │   ├── validators.js   # 验证者 API
│   │   └── governance.js   # 治理 API
│   ├── utils/              # 工具函数
│   └── server.js           # 主服务器
├── public/                 # Web 界面静态文件  ✅
├── tests/                  # 测试文件  ✅
├── scripts/                # 构建和部署脚本  ✅
└── docs/                   # 项目文档
```