// test-random.js
const crypto = require("crypto");

for (let i = 0; i < 5; i++) {
  console.log(crypto.randomBytes(32).toString("hex"));
}
