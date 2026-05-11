// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "인증 토큰이 필요합니다." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "유효하지 않은 토큰입니다." });
  }
}

module.exports = { requireAuth };
