const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { authLimiter, authMiddleware } = require('../middleware');
const { sendCode, verifyCode } = require('../sms');

module.exports = function(db) {
  const router = express.Router();

  function buildUser(u) {
    return { id:u.id, username:u.username, phone:u.phone, avatar:u.avatar, avatarUrl:u.avatar_url||'', createdAt:u.created_at };
  }
  function signToken(user) {
    return jwt.sign({ id:user.id, username:user.username, avatar:user.avatar }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  }

  router.post('/send-code', authLimiter, async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ error: '请输入手机号' });
      if (!new RegExp(config.sms?.phoneRegex || '^1[3-9]\\d{9}$').test(phone))
        return res.status(400).json({ error: '手机号格式不正确' });
      const result = await sendCode(phone);
      res.json({ success: true, devMode: result.devMode || false });
    } catch(e) { res.status(429).json({ error: e.message }); }
  });

  router.post('/register', authLimiter, async (req, res) => {
    try {
      const { username, phone, code } = req.body;
      if (!username || !phone || !code) return res.status(400).json({ error: '请填写完整信息' });
      if (username.length < 3 || username.length > 20) return res.status(400).json({ error: '用户名需3-20个字符' });
      if (!new RegExp(config.sms?.phoneRegex || '^1[3-9]\\d{9}$').test(phone))
        return res.status(400).json({ error: '手机号格式不正确' });
      const vr = verifyCode(phone, code);
      if (!vr.ok) return res.status(400).json({ error: vr.error });
      if (db.prepare('SELECT id FROM users WHERE phone=?').get(phone))
        return res.status(409).json({ error: '该手机号已注册' });
      if (db.prepare('SELECT id FROM users WHERE username=?').get(username))
        return res.status(409).json({ error: '该用户名已被占用' });
      const avatar = username.charAt(0).toUpperCase();
      const r = db.prepare('INSERT INTO users (username,phone,avatar) VALUES (?,?,?)').run(username, phone, avatar);
      const user = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);
      res.json({ token: signToken(user), user: buildUser(user) });
    } catch(e) { console.error(e); res.status(500).json({ error: '服务器错误' }); }
  });

  router.post('/login', authLimiter, (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return res.status(400).json({ error: '请输入手机号和验证码' });
      const vr = verifyCode(phone, code);
      if (!vr.ok) return res.status(400).json({ error: vr.error });
      const user = db.prepare('SELECT * FROM users WHERE phone=?').get(phone);
      if (!user) return res.status(404).json({ error: '该手机号未注册' });
      res.json({ token: signToken(user), user: buildUser(user) });
    } catch(e) { console.error(e); res.status(500).json({ error: '服务器错误' }); }
  });

  router.get('/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(buildUser(user));
  });

  return router;
};