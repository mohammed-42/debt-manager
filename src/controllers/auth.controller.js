const {
  registerUser,
  verifyUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
} = require("../services/auth.service");

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await registerUser({ email, password });
    res.status(201).json({ message: "Registered. Check your email for a verification code.", user });
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }
    const user = await verifyUser({ email, code });
    res.status(200).json({ message: "Email verified successfully", user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const deviceInfo = req.headers["user-agent"] || null;
    const ipAddress = req.ip;

    const { accessToken, refreshToken, user } = await loginUser({
      email,
      password,
      deviceInfo,
      ipAddress,
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "Login successful", accessToken, user });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const { accessToken } = await refreshAccessToken({ refreshToken });
    res.status(200).json({ accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await logoutUser({ refreshToken });
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, verify, login, refresh, logout };