# WTF Cosmos JS

🚀 **一个基于 CosmJS 的增强型区块链实现**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/Rexingleung/wtf-cosmos-js.svg)](https://github.com/Rexingleung/wtf-cosmos-js/stargazers)

WTF Cosmos JS 是一个功能完整的区块链实现，基于 Cosmos SDK 的核心概念构建。它提供了完整的挖矿、交易、验证器管理和治理功能，是学习和理解区块链技术的完美工具。

## ✨ 特性

### 🔗 核心区块链功能
- **工作量证明 (PoW) 挖矿** - 可配置难度的挖矿算法
- **权益证明 (PoS) 验证器** - 完整的验证器生命周期管理
- **交易系统** - 支持多种交易类型和数字签名
- **智能合约支持** - 基本的智能合约执行环境

### 🛡️ 验证器功能
- **动态验证器集合** - 自动选择和轮换验证器
- **惩罚机制 (Slashing)** - 对恶意行为的经济惩罚
- **监禁系统** - 临时移除表现不佳的验证器
- **质押管理** - 灵活的质押和解质押机制

### 🗳️ 治理系统
- **提案系统** - 链上治理提案和投票
- **参数治理** - 动态调整区块链参数
- **社区驱动** - 去中心化决策机制
- **投票权重** - 基于质押的投票权重

### 🔐 安全特性
- **加密安全** - 使用 secp256k1 椭圆曲线加密
- **多重签名** - 支持多重签名钱包
- **访问控制** - 基于角色的权限管理
- **审计日志** - 完整的操作审计跟踪

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装和运行

```bash
# 克隆项目
git clone https://github.com/Rexingleung/wtf-cosmos-js.git
cd wtf-cosmos-js

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 启动开发服务器
npm run dev

# 或启动生产服务器
npm start
```

服务器将在 `http://localhost:3000` 上运行。

## 📚 API 文档

### 🔗 区块链 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/blockchain` | 获取完整区块链信息 |
| GET | `/api/blocks` | 获取所有区块 |
| GET | `/api/blocks/:hash` | 获取特定区块 |
| GET | `/api/transactions/:hash` | 获取交易详情 |
| GET | `/api/pending-transactions` | 获取待处理交易 |
| GET | `/api/validate` | 验证区块链完整性 |

### 💰 钱包 API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/wallets` | 创建新钱包 |
| GET | `/api/wallets/:address` | 获取钱包信息 |
| GET | `/api/wallets/:address/balance` | 获取钱包余额 |
| GET | `/api/wallets/:address/transactions` | 获取钱包交易历史 |

### 💸 交易 API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/transactions` | 创建新交易 |
| POST | `/api/transactions/multi-send` | 批量转账 |
| POST | `/api/transactions/delegate` | 委托质押 |
| POST | `/api/transactions/undelegate` | 解除质押 |

### ⛏️ 挖矿 API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/mine` | 开始挖矿 |
| GET | `/api/mining/stats` | 获取挖矿统计 |
| POST | `/api/mining/stop` | 停止挖矿 |

### 👥 验证器 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/validators` | 获取所有验证器 |
| POST | `/api/validators` | 注册新验证器 |
| GET | `/api/validators/:address` | 获取验证器详情 |
| POST | `/api/validators/:address/unjail` | 解除验证器监禁 |

### 🗳️ 治理 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/governance/proposals` | 获取所有提案 |
| POST | `/api/governance/proposals` | 创建新提案 |
| GET | `/api/governance/proposals/:id` | 获取提案详情 |
| POST | `/api/governance/proposals/:id/vote` | 投票 |
| POST | `/api/governance/proposals/:id/deposit` | 存入押金 |

## 📖 使用示例

### 创建钱包

```bash
curl -X POST http://localhost:3000/api/wallets
```

### 发送交易

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "wtf1abc...xyz",
    "toAddress": "wtf1def...abc",
    "amount": 100,
    "privateKey": "0x123...789"
  }'
```

### 开始挖矿

```bash
curl -X POST http://localhost:3000/api/mine \
  -H "Content-Type: application/json" \
  -d '{
    "minerAddress": "wtf1abc...xyz"
  }'
```

## 📁 项目结构

```
wtf-cosmos-js/
├── src/
│   ├── blockchain/           # 区块链核心逻辑
│   ├── consensus/           # 共识机制
│   ├── crypto/              # 加密模块
│   ├── governance/          # 治理模块
│   ├── network/             # 网络模块
│   ├── api/                 # API 路由
│   ├── middleware/          # 中间件
│   ├── utils/               # 工具函数
│   ├── config/              # 配置文件
│   └── server.js            # 服务器入口
├── public/                  # 静态文件
├── tests/                   # 测试文件
└── docs/                    # 文档
```

## 🤝 贡献指南

1. Fork 这个仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Cosmos SDK](https://github.com/cosmos/cosmos-sdk) - 区块链框架
- [CosmJS](https://github.com/cosmos/cosmjs) - JavaScript SDK
- [Tendermint](https://github.com/tendermint/tendermint) - 共识引擎

---

**⭐ 如果这个项目对你有帮助，请给它一个星标！**