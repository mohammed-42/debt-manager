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
  getRefreshTokenLookupHash,
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

  return {
    id: user.id,
    email: user.email,
  };
}

async function verifyUser({ email, code }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

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

  if (
    !user.verificationCodeHash ||
    user.verificationCodeExpiry < new Date()
  ) {
    const err = new Error("Code expired. Request a new code.");
    err.status = 400;
    throw err;
  }

  const isMatch = await compareVerificationCode(
    code,
    user.verificationCodeHash
  );

  if (!isMatch) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationAttempts: {
          increment: 1,
        },
      },
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

  return {
    id: user.id,
    email: user.email,
  };
}

async function loginUser({ email, password, deviceInfo, ipAddress }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

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

  const isMatch = await comparePassword(
    password,
    user.passwordHash
  );

  if (!isMatch) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user.id);

  const refreshToken = generateRefreshToken();

  const tokenHash = await hashRefreshToken(refreshToken);

  const tokenLookupHash =
    getRefreshTokenLookupHash(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      tokenLookupHash,
      deviceInfo,
      ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

async function refreshAccessToken({ refreshToken }) {
  if (!refreshToken) {
    const err = new Error("Refresh token missing");
    err.status = 401;
    throw err;
  }

  const tokenLookupHash =
    getRefreshTokenLookupHash(refreshToken);

  const matched = await prisma.refreshToken.findUnique({
    where: {
      tokenLookupHash,
    },
  });

  if (!matched) {
    const err = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  if (matched.revoked || matched.expiresAt <= new Date()) {
    const err = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  const isMatch = await compareRefreshToken(
    refreshToken,
    matched.tokenHash
  );

  if (!isMatch) {
    const err = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  const newRefreshToken = generateRefreshToken();

  const newTokenHash =
    await hashRefreshToken(newRefreshToken);

  const newTokenLookupHash =
    getRefreshTokenLookupHash(newRefreshToken);

  const newAccessToken =
    generateAccessToken(matched.userId);

  const newExpiry = getRefreshTokenExpiry();

 await prisma.$transaction(
    async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: {
          id: matched.id,
          revoked: false,
        },
        data: {
          revoked: true,
        },
      });

      if (revoked.count !== 1) {
        const err = new Error(
          "Refresh token already used or revoked"
        );
        err.status = 401;
        throw err;
      }

      const newToken = await tx.refreshToken.create({
        data: {
          userId: matched.userId,
          tokenHash: newTokenHash,
          tokenLookupHash: newTokenLookupHash,
          deviceInfo: matched.deviceInfo,
          ipAddress: matched.ipAddress,
          expiresAt: newExpiry,
        },
      });

      return newToken;
    }
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

async function logoutUser({ refreshToken }) {
  if (!refreshToken) return;

  const tokenLookupHash =
    getRefreshTokenLookupHash(refreshToken);

  const matched = await prisma.refreshToken.findUnique({
    where: {
      tokenLookupHash,
    },
  });

  if (!matched) return;

  if (matched.revoked) return;

  await prisma.refreshToken.update({
    where: {
      id: matched.id,
    },
    data: {
      revoked: true,
    },
  });
}

async function logoutAllUser({ refreshToken }) {
  if (!refreshToken) {
    const err = new Error("Refresh token missing");
    err.status = 401;
    throw err;
  }

  const tokenLookupHash =
    getRefreshTokenLookupHash(refreshToken);

  const matched = await prisma.refreshToken.findUnique({
    where: {
      tokenLookupHash,
    },
  });

  if (!matched || matched.revoked) {
    const err = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  await prisma.refreshToken.updateMany({
    where: {
      userId: matched.userId,
      revoked: false,
    },
    data: {
      revoked: true,
    },
  });
}

module.exports = {
  registerUser,
  verifyUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  logoutAllUser,
};