const prisma = require("../config/db");
const {
  hashPassword,
  comparePassword,
  generateVerificationCode,
  hashVerificationCode,
  compareVerificationCode,
} = require("../utils/hash");
const { sendVerificationEmail } = require("./email.service");
const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  getRefreshTokenExpiry,
} = require("../utils/token.js");

const CODE_EXPIRY_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;

async function registerUser({ email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("Email already registered");
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const code = generateVerificationCode();
  const verificationCodeHash = await hashVerificationCode(code);
  const verificationCodeExpiry = new Date(
    Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000
  );

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      verificationCodeHash,
      verificationCodeExpiry,
      verificationAttempts: 0,
    },
  });

  await sendVerificationEmail(email, code);

  return { id: user.id, email: user.email };
}

async function verifyUser({ email, code }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error("Invalid email or code");
    err.status = 400;
    throw err;
  }

  if (user.isVerified) {
    const err = new Error("User already verified");
    err.status = 400;
    throw err;
  }

  if (user.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    const err = new Error("Too many attempts. Request a new code.");
    err.status = 429;
    throw err;
  }

  if (!user.verificationCodeHash || user.verificationCodeExpiry < new Date()) {
    const err = new Error("Code expired. Request a new code.");
    err.status = 400;
    throw err;
  }

  const isMatch = await compareVerificationCode(code, user.verificationCodeHash);

  if (!isMatch) {
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationAttempts: { increment: 1 } },
    });
    const err = new Error("Invalid code");
    err.status = 400;
    throw err;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationCodeHash: null,
      verificationCodeExpiry: null,
      verificationAttempts: 0,
    },
  });

  return { id: user.id, email: user.email };
}

async function loginUser({ email, password, deviceInfo, ipAddress }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  if (!user.isVerified) {
    const err = new Error("Please verify your email before logging in");
    err.status = 403;
    throw err;
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();
  const tokenHash = await hashRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceInfo,
      ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email } };
}

async function refreshAccessToken({ refreshToken }) {
  if (!refreshToken) {
    const err = new Error("Refresh token missing");
    err.status = 401;
    throw err;
  }

  const candidates = await prisma.refreshToken.findMany({
    where: { revoked: false, expiresAt: { gt: new Date() } },
  });

  let matched = null;
  for (const candidate of candidates) {
    if (await compareRefreshToken(refreshToken, candidate.tokenHash)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    const err = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  const accessToken = generateAccessToken(matched.userId);
  return { accessToken };
}

async function logoutUser({ refreshToken }) {
  if (!refreshToken) return;

  const candidates = await prisma.refreshToken.findMany({
    where: { revoked: false },
  });

  for (const candidate of candidates) {
    if (await compareRefreshToken(refreshToken, candidate.tokenHash)) {
      await prisma.refreshToken.update({
        where: { id: candidate.id },
        data: { revoked: true },
      });
      break;
    }
  }
}

module.exports = {
  registerUser,
  verifyUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
};