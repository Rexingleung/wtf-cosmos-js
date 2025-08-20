# WTF Cosmos JS - 区块链学习项目

[![Build Status](https://github.com/Rexingleung/wtf-cosmos-js/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/Rexingleung/wtf-cosmos-js/actions)
[![codecov](https://codecov.io/gh/Rexingleung/wtf-cosmos-js/branch/main/graph/badge.svg)](https://codecov.io/gh/Rexingleung/wtf-cosmos-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/wtf-cosmos-js.svg)](https://www.npmjs.com/package/wtf-cosmos-js)

> 🚀 用 JavaScript 构建的教育性区块链实现，灵感来自 Cosmos SDK

## 📖 项目介绍

WTF Cosmos JS 是一个用 JavaScript 从零开始实现的区块链项目，专门设计用于教育和学习目的。它实现了现代区块链的核心功能，包括工作量证明共识、验证者系统、治理机制等，让开发者能够深入理解区块链技术的内部工作原理。

## ✨ 核心特性

### 🔗 区块链基础
- ⛓️ **完整区块链实现** - 从创世区块到最新区块的完整链式结构
- 🏗️ **工作量证明 (PoW)** - 经典的 PoW 共识算法，支持难度调整
- 💰 **原生代币系统** - WTF 代币的发行、转账和余额管理
- 🔐 **加密安全** - ECDSA 数字签名和 SHA-256 哈希算法
- 📦 **交易池管理** - 待处理交易的收集和验证

### 👥 验证者系统
- 🏛️ **验证者注册** - 支持验证者注册和质押机制
- 🤝 **委托机制** - 代币持有者可以委托给验证者
- ⚖️ **惩罚系统** - 对恶意行为的自动惩罚机制
- 🔒 **监禁功能** - 临时禁用不当行为的验证者
- 📊 **验证者统计** - 实时追踪验证者表现和收益

### 🗳️ 链上治理
- 📝 **提案系统** - 支持参数修改、软件升级等提案类型
- 🗳️ **投票机制** - 代币持有者参与治理决策
- 💎 **押金机制** - 防止垃圾提案的经济激励
- ⏰ **投票周期** - 标准化的提案生命周期管理
- 📈 **治理统计** - 提案历史和投票数据分析

### 🌐 RESTful API
- 🔌 **完整 API 接口** - 涵盖所有区块链功能的 REST API
- 📚 **详细文档** - 包含示例代码的完整 API 文档
- 🛡️ **安全中间件** - CORS、Helmet、速率限制等安全保护
- 📊 **实时数据** - WebSocket 支持的实时数据推送（计划中）
- 🧪 **易于测试** - 友好的测试接口和调试工具

### 🖥️ Web 界面
- 📱 **响应式设计** - 支持桌面端和移动端访问
- 🎨 **现代 UI** - 基于 Tailwind CSS 的美观界面
- 📊 **实时监控** - 区块链状态的实时可视化
- 💼 **钱包管理** - 图形化的钱包创建和管理
- ⛏️ **挖矿面板** - 直观的挖矿控制和监控界面

### 🔧 开发者工具
- 📦 **Docker 支持** - 一键部署的容器化方案
- 🧪 **完整测试套件** - 单元测试、集成测试和覆盖率报告
- 📝 **代码质量** - ESLint、Prettier 代码规范化
- 📖 **详细文档** - 从入门到高级的完整文档
- 🔄 **CI/CD 管道** - 自动化测试、构建和部署

## 🚀 快速开始

### 环境要求

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **Git**
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
- **📚 API 文档**: http://localhost:3000/api (在线文档)

### Docker 快速启动

```bash
# 使用 Docker Compose
docker-compose up -d

# 或构建并运行
docker build -t wtf-cosmos-js .
docker run -p 3000:3000 wtf-cosmos-js
```

## 📚 使用指南

### 基础操作

#### 1. 创建钱包

```javascript
// 通过 API
const response = await fetch('/api/wallets', { method: 'POST' });
const wallet = await response.json();

// 通过 SDK
const { Wallet } = require('wtf-cosmos-js');
const wallet = new Wallet();
console.log('地址:', wallet.address);
console.log('私钥:', wallet.privateKey);
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
await fetch('/api/mining', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ minerAddress: 'wtf1miner...' })
});

// 查看挖矿状态
const status = await fetch('/api/mining/status').then(r => r.json());
console.log('挖矿状态:', status.isMining);
```

#### 4. 验证者操作

```javascript
// 注册验证者
const validatorInfo = {
  address: 'wtf1validator123...',
  stake: 10000,
  commission: 0.1,
  description: { moniker: 'MyValidator' },
  privateKey: 'validator_private_key'
};

await fetch('/api/validators', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(validatorInfo)
});
```

#### 5. 参与治理

```javascript
// 创建提案
const proposal = {
  proposer: 'wtf1proposer...',
  title: '增加区块大小',
  description: '建议将最大区块大小从1MB增加到2MB',
  type: 'ParameterChange',
  deposit: 1000,
  privateKey: 'proposer_private_key'
};

await fetch('/api/governance/proposals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(proposal)
});
```

### Web 界面操作

1. **仪表盘** - 查看区块链概览和实时统计
2. **区块浏览** - 浏览区块和交易历史
3. **钱包管理** - 创建钱包、查看余额和交易历史
4. **交易操作** - 发送转账、批量转账等交易
5. **挖矿控制** - 启动/停止挖矿，查看挖矿统计
6. **验证者** - 查看验证者列表和详细信息

## 🏗️ 项目架构

```
wtf-cosmos-js/
├── src/
│   ├── blockchain/          # 区块链核心逻辑
│   │   ├── Block.js        # 区块定义
│   │   ├── Blockchain.js   # 区块链主类
│   │   └── Transaction.js  # 交易定义
│   ├── consensus/          # 共识机制
│   │   ├── ProofOfWork.js  # PoW 实现
│   │   └── Validator.js    # 验证者管理
│   ├── crypto/             # 加密模块
│   │   ├── Wallet.js       # 钱包实现
│   │   └── KeyManager.js   # 密钥管理
│   ├── governance/         # 治理模块
│   │   ├── Proposal.js     # 提案管理
│   │   └── Voting.js       # 投票机制
│   ├── api/                # API 路由
│   │   ├── blockchain.js   # 区块链 API
│   │   ├── transactions.js # 交易 API
│   │   ├── mining.js       # 挖矿 API
│   │   ├── wallets.js      # 钱包 API
│   │   └── governance.js   # 治理 API
│   ├── utils/              # 工具函数
│   └── server.js           # 主服务器
├── public/                 # Web 界面静态文件
├── tests/                  # 测试文件
├── docs/                   # 项目文档
├── scripts/                # 构建和部署脚本
└── docker/                 # Docker 配置
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

## 📖 文档

- **[🚀 入门教程](docs/TUTORIAL.md)** - 从零开始的详细教程
- **[📡 API 文档](docs/API.md)** - 完整的 API 接口说明
- **[🏗️ 架构设计](docs/ARCHITECTURE.md)** - 系统架构和设计思路
- **[🔐 安全模型](docs/SECURITY.md)** - 安全特性和注意事项
- **[❓ 常见问题](docs/FAQ.md)** - 常见问题和解决方案
- **[📝 示例代码](docs/EXAMPLES.md)** - 丰富的使用示例
- **[🤝 贡献指南](CONTRIBUTING.md)** - 参与项目开发的指南

## 🛣️ 开发路线图

### v1.0.0 ✅ （当前版本）
- ✅ 基础区块链实现
- ✅ PoW 共识机制
- ✅ 验证者系统
- ✅ 链上治理
- ✅ RESTful API
- ✅ Web 界面
- ✅ Docker 支持

### v1.1.0 🚧 （开发中）
- 🔄 WebSocket 实时通信
- 🔄 智能合约支持（简化版）
- 🔄 跨链桥接（概念验证）
- 🔄 性能优化和监控

### v1.2.0 📋 （计划中）
- 📋 P2P 网络实现
- 📋 分片技术探索
- 📋 Layer 2 解决方案
- 📋 移动端 App

### v2.0.0 🔮 （长期规划）
- 🔮 权益证明 (PoS) 共识
- 🔮 完整智能合约虚拟机
- 🔮 隐私保护功能
- 🔮 生产级性能优化

## 🤝 贡献

我们热烈欢迎社区贡献！无论是:

- 🐛 **报告 Bug** - 发现问题请创建 Issue
- 💡 **提出想法** - 新功能建议和改进意见
- 🔧 **代码贡献** - 提交 Pull Request 修复问题或添加功能
- 📚 **改进文档** - 完善文档和示例代码
- 🎨 **UI/UX 设计** - 改善用户界面和体验

请阅读 [贡献指南](CONTRIBUTING.md) 了解详细的贡献流程。

### 贡献者

感谢所有为项目做出贡献的开发者！

<a href="https://github.com/Rexingleung/wtf-cosmos-js/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Rexingleung/wtf-cosmos-js" />
</a>

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## ⚠️ 重要声明

**本项目仅用于教育和学习目的，不适合在生产环境中使用。**

- 🚫 **不要用于生产环境** - 缺乏生产级安全特性
- 🔒 **私钥安全** - 请妥善保管测试用的私钥
- 🧪 **实验性质** - 某些功能可能存在不稳定性
- 📚 **学习用途** - 设计目标是理解区块链原理

## 📞 联系我们

- **项目主页**: https://github.com/Rexingleung/wtf-cosmos-js
- **问题报告**: [GitHub Issues](https://github.com/Rexingleung/wtf-cosmos-js/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/Rexingleung/wtf-cosmos-js/discussions)
- **WTF Academy**: [wtf.academy](https://wtf.academy/)
- **社区群组**: [加入我们的社区](https://discord.gg/wtfacademy)

## 🌟 致谢

本项目的灵感和技术参考来源于：

- **[Cosmos SDK](https://cosmos.network/)** - 模块化区块链框架
- **[CosmJS](https://github.com/cosmos/cosmjs)** - Cosmos 生态系统的 JavaScript 库
- **[Bitcoin](https://bitcoin.org/)** - 第一个区块链实现
- **[Ethereum](https://ethereum.org/)** - 智能合约平台
- **[WTF Academy](https://wtf.academy/)** - Web3 教育平台

特别感谢所有为区块链技术发展做出贡献的开发者和研究者！

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐ Star！**

*Built with ❤️ by [WTF Academy](https://wtf.academy/)*

</div>