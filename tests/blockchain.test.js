/**
 * WTF Cosmos JS - Blockchain Tests
 * 区块链核心功能测试
 */

const { Blockchain } = require('../src/blockchain');
const { Transaction } = require('../src/blockchain');
const { Wallet } = require('../src/crypto');

describe('Blockchain', () => {
  let blockchain;
  let wallet1;
  let wallet2;

  beforeEach(() => {
    blockchain = new Blockchain({
      miningReward: 50,
      difficulty: 2
    });
    wallet1 = new Wallet();
    wallet2 = new Wallet();
  });

  describe('Initialization', () => {
    test('should create genesis block', () => {
      expect(blockchain.chain.length).toBe(1);
      expect(blockchain.chain[0].index).toBe(0);
      expect(blockchain.chain[0].previousHash).toBe('0');
    });

    test('should have initial supply', () => {
      expect(blockchain.stats.totalSupply).toBe(1000000);
      expect(blockchain.getBalance('wtf1genesis000000000000000000000000')).toBe(1000000);
    });
  });

  describe('Transactions', () => {
    test('should add valid transaction to pool', () => {
      // 给 wallet1 一些余额
      blockchain.balances.set(wallet1.address, 1000);
      
      const transaction = new Transaction(
        wallet1.address,
        wallet2.address,
        100,
        1,
        'transfer'
      );
      transaction.signTransaction(wallet1.keyPair);

      const success = blockchain.addTransaction(transaction);
      expect(success).toBe(true);
      expect(blockchain.pendingTransactions.length).toBe(1);
    });

    test('should reject transaction with insufficient balance', () => {
      const transaction = new Transaction(
        wallet1.address,
        wallet2.address,
        100,
        1,
        'transfer'
      );
      transaction.signTransaction(wallet1.keyPair);

      const success = blockchain.addTransaction(transaction);
      expect(success).toBe(false);
    });

    test('should reject invalid transaction', () => {
      blockchain.balances.set(wallet1.address, 1000);
      
      const transaction = new Transaction(
        wallet1.address,
        wallet2.address,
        100,
        1,
        'transfer'
      );
      // 不签名，无效交易

      const success = blockchain.addTransaction(transaction);
      expect(success).toBe(false);
    });
  });

  describe('Mining', () => {
    test('should mine block with pending transactions', async () => {
      // 添加一些交易
      blockchain.balances.set(wallet1.address, 1000);
      
      const transaction = new Transaction(
        wallet1.address,
        wallet2.address,
        100,
        1,
        'transfer'
      );
      transaction.signTransaction(wallet1.keyPair);
      blockchain.addTransaction(transaction);

      const initialLength = blockchain.chain.length;
      const minerAddress = 'wtf1miner123';

      const newBlock = await blockchain.minePendingTransactions(minerAddress);
      
      expect(blockchain.chain.length).toBe(initialLength + 1);
      expect(newBlock.transactions.length).toBe(2); // 1 user tx + 1 reward tx
      expect(blockchain.pendingTransactions.length).toBe(0);
      expect(blockchain.getBalance(minerAddress)).toBe(50); // mining reward
    });

    test('should update balances after mining', async () => {
      blockchain.balances.set(wallet1.address, 1000);
      
      const transaction = new Transaction(
        wallet1.address,
        wallet2.address,
        100,
        1,
        'transfer'
      );
      transaction.signTransaction(wallet1.keyPair);
      blockchain.addTransaction(transaction);

      await blockchain.minePendingTransactions('wtf1miner123');

      expect(blockchain.getBalance(wallet1.address)).toBe(899); // 1000 - 100 - 1 (fee)
      expect(blockchain.getBalance(wallet2.address)).toBe(100);
    });
  });

  describe('Balance Management', () => {
    test('should get correct balance', () => {
      blockchain.balances.set(wallet1.address, 500);
      expect(blockchain.getBalance(wallet1.address)).toBe(500);
      expect(blockchain.getBalance(wallet2.address)).toBe(0);
    });

    test('should track transaction history', () => {
      blockchain.balances.set(wallet1.address, 1000);
      
      const transaction = new Transaction(
        wallet1.address,
        wallet2.address,
        100,
        1,
        'transfer'
      );
      transaction.signTransaction(wallet1.keyPair);
      blockchain.addTransaction(transaction);

      // 模拟挖矿后的状态
      blockchain.chain.push({
        index: 1,
        timestamp: Date.now(),
        transactions: [transaction],
        hash: 'mock-hash'
      });

      const history = blockchain.getTransactionHistory(wallet1.address);
      expect(history.length).toBe(1);
      expect(history[0].fromAddress).toBe(wallet1.address);
    });
  });

  describe('Validation', () => {
    test('should validate entire blockchain', () => {
      expect(blockchain.validateChain()).toBe(true);
    });

    test('should detect invalid blockchain', () => {
      // 篡改区块
      blockchain.chain[0].hash = 'tampered-hash';
      expect(blockchain.validateChain()).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should provide correct stats', () => {
      const stats = blockchain.getStats();
      expect(stats).toHaveProperty('totalSupply');
      expect(stats).toHaveProperty('totalTransactions');
      expect(stats).toHaveProperty('chainLength');
      expect(stats).toHaveProperty('difficulty');
    });
  });
});

describe('Transaction', () => {
  let wallet1;
  let wallet2;

  beforeEach(() => {
    wallet1 = new Wallet();
    wallet2 = new Wallet();
  });

  test('should create valid transaction', () => {
    const transaction = new Transaction(
      wallet1.address,
      wallet2.address,
      100,
      1,
      'transfer'
    );

    expect(transaction.fromAddress).toBe(wallet1.address);
    expect(transaction.toAddress).toBe(wallet2.address);
    expect(transaction.amount).toBe(100);
    expect(transaction.fee).toBe(1);
    expect(transaction.hash).toBeDefined();
  });

  test('should sign and validate transaction', () => {
    const transaction = new Transaction(
      wallet1.address,
      wallet2.address,
      100,
      1,
      'transfer'
    );

    // 签名前应该无效
    expect(transaction.isValid()).toBe(false);

    // 签名后应该有效
    transaction.signTransaction(wallet1.keyPair);
    expect(transaction.isValid()).toBe(true);
  });

  test('should detect tampered transaction', () => {
    const transaction = new Transaction(
      wallet1.address,
      wallet2.address,
      100,
      1,
      'transfer'
    );
    transaction.signTransaction(wallet1.keyPair);

    // 篡改金额
    transaction.amount = 1000;
    expect(transaction.isValid()).toBe(false);
  });
});