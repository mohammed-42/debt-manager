const bcrypt = require("bcrypt");
const crypto = require("crypto");

const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateVerificationCode() {
  // 6-digit numeric code
  return crypto.randomInt(100000, 999999).toString();
}

async function hashVerificationCode(code) {
  return bcrypt.hash(code, SALT_ROUNDS);
}

async function compareVerificationCode(code, hash) {
  return bcrypt.compare(code, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
  generateVerificationCode,
  hashVerificationCode,
  compareVerificationCode,
};