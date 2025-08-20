/**
 * WTF Cosmos JS - Wallet
 * 钱包管理类
 */

const { randomBytes } = require('crypto');
const secp256k1 = require('secp256k1');
const { bech32 } = require('bech32');
const { sha256, generateRandomId } = require('../utils/helpers');
const config = require('../config');
const { logger } = require('../utils/logger');

class Wallet {
  constructor(privateKey = null) {
    if (privateKey) {
      this.privateKey = privateKey;
    } else {
      // 生成新的私钥
      let privKey;
      do {
        privKey = randomBytes(32);
      } while (!secp256k1.privateKeyVerify(privKey));
      
      this.privateKey = privKey.toString('hex');
    }
    
    // 生成公钥
    this.publicKey = this.generatePublicKey();
    
    // 生成地址
    this.address = this.generateAddress();
    
    // 生成助记词 (简化版本)
    this.mnemonic = this.generateMnemonic();
    
    logger.info(`Created new wallet: ${this.address}`);
  }

  /**
   * 生成公钥
   * @returns {string} 公钥
   */
  generatePublicKey() {
    const privateKeyBuffer = Buffer.from(this.privateKey, 'hex');
    const publicKeyBuffer = secp256k1.publicKeyCreate(privateKeyBuffer);
    return publicKeyBuffer.toString('hex');
  }

  /**
   * 生成地址
   * @returns {string} 地址
   */
  generateAddress() {
    // 使用公钥生成地址
    const publicKeyBuffer = Buffer.from(this.publicKey, 'hex');
    const hash = sha256(publicKeyBuffer.toString('hex'));
    const address20 = hash.slice(0, 40); // 取20字节
    
    // 转换为 bech32 格式
    const words = bech32.toWords(Buffer.from(address20, 'hex'));
    return bech32.encode(config.NETWORK.PREFIX, words);
  }

  /**
   * 生成助记词 (简化版)
   * @returns {string} 助记词
   */
  generateMnemonic() {
    // 简化版本：使用随机单词生成助记词
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'action', 'actor', 'actress', 'actual', 'adapt',
      'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice',
      'aerobic', 'affair', 'afford', 'afraid', 'again', 'against', 'age', 'agent',
      'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album'
    ];
    
    const mnemonic = [];
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      mnemonic.push(words[randomIndex]);
    }
    
    return mnemonic.join(' ');
  }

  /**
   * 签名数据
   * @param {string} data - 要签名的数据
   * @returns {string} 签名
   */
  sign(data) {
    try {
      const dataHash = sha256(data);
      const privateKeyBuffer = Buffer.from(this.privateKey, 'hex');
      const messageBuffer = Buffer.from(dataHash, 'hex');
      
      const signature = secp256k1.ecdsaSign(messageBuffer, privateKeyBuffer);
      return Buffer.concat([
        signature.signature,
        Buffer.from([signature.recovery])
      ]).toString('hex');
    } catch (error) {
      logger.error('Error signing data:', error);
      throw new Error('签名失败');
    }
  }

  /**
   * 验证签名
   * @param {string} data - 原始数据
   * @param {string} signature - 签名
   * @param {string} publicKey - 公钥
   * @returns {boolean} 验证结果
   */
  static verifySignature(data, signature, publicKey) {
    try {
      const dataHash = sha256(data);
      const messageBuffer = Buffer.from(dataHash, 'hex');
      const signatureBuffer = Buffer.from(signature, 'hex');
      const publicKeyBuffer = Buffer.from(publicKey, 'hex');
      
      const signatureObj = {
        signature: signatureBuffer.slice(0, 64),
        recovery: signatureBuffer[64]
      };
      
      return secp256k1.ecdsaVerify(signatureObj.signature, messageBuffer, publicKeyBuffer);
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * 从私钥恢复钱包
   * @param {string} privateKey - 私钥
   * @returns {Wallet} 钱包实例
   */
  static fromPrivateKey(privateKey) {
    return new Wallet(privateKey);
  }

  /**
   * 获取钱包信息
   * @returns {object} 钱包信息
   */
  getInfo() {
    return {
      address: this.address,
      publicKey: this.publicKey,
      mnemonic: this.mnemonic,
    };
  }

  /**
   * 获取私钥 (谨慎使用)
   * @returns {string} 私钥
   */
  getPrivateKey() {
    return this.privateKey;
  }

  /**
   * 导出钱包 JSON
   * @returns {object} 钱包 JSON
   */
  export() {
    return {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address,
      mnemonic: this.mnemonic,
      createdAt: Date.now(),
    };
  }

  /**
   * 从 JSON 导入钱包
   * @param {object} walletData - 钱包数据
   * @returns {Wallet} 钱包实例
   */
  static import(walletData) {
    const wallet = new Wallet(walletData.privateKey);
    return wallet;
  }
}

module.exports = Wallet;