const { verifyAccessToken } = require("../utils/token.js");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: "Missing access token",
    });
  }

  try {
    const payload = verifyAccessToken(token);

    if (!payload.sub) {
      return res.status(401).json({
        message: "Invalid access token",
      });
    }

    req.userId = payload.sub;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
}

module.exports = requireAuth;