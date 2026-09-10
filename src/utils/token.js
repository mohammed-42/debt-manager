const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function generateAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

async function hashRefreshToken(token) {
  return bcrypt.hash(token, 12);
}

async function compareRefreshToken(token, hash) {
  return bcrypt.compare(token, hash);
}

function getRefreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  getRefreshTokenExpiry,
  verifyAccessToken,
};