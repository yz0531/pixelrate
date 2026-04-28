const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('./config');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try { req.user = jwt.verify(token, config.jwtSecret); next(); }
  catch { res.status(401).json({ error: '登录已过期' }); }
}

const authLimiter = rateLimit({ windowMs: config.authRateLimit.windowMs, max: config.authRateLimit.max, message: { error: '请求太频繁' } });
const apiLimiter = rateLimit({ windowMs: config.apiRateLimit.windowMs, max: config.apiRateLimit.max, message: { error: '请求太频繁' } });

module.exports = { authMiddleware, authLimiter, apiLimiter };