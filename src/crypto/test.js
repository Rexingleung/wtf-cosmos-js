// demo.js (CommonJS)

const crypto = require("crypto");
const { bech32 } = require("bech32");

// 生成随机私钥（32字节）
function generatePrivateKey() {
  return crypto.randomBytes(32).toString("hex");
}

// 通过 secp256k1 生成公钥
function getPublicKey(privateKeyHex) {
  const secp256k1 = require("secp256k1");
  const privKey = Buffer.from(privateKeyHex, "hex");
  const pubKey = secp256k1.publicKeyCreate(privKey, true); // 压缩格式
  return pubKey.toString("hex");
}

// 通过公钥生成 bech32 地址
function getAddressFromPublicKey(publicKeyHex, prefix = "cosmos") {
  const pubKeyBytes = Buffer.from(publicKeyHex, "hex");

  // 1. sha256
  const sha256Hash = crypto.createHash("sha256").update(pubKeyBytes).digest();

  // 2. ripemd160
  const ripemd160Hash = crypto.createHash("ripemd160").update(sha256Hash).digest();

  // 3. bech32 编码
  const words = bech32.toWords(ripemd160Hash);
  return bech32.encode(prefix, words);
}

// -------- 测试 --------
const privKey = generatePrivateKey();
const pubKey = getPublicKey(privKey);
const address = getAddressFromPublicKey(pubKey, "cosmos");

console.log("私钥:", privKey);
console.log("公钥:", pubKey);
console.log("地址:", address);
