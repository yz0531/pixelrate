const express = require('express');
const config = require('../config');
const { authMiddleware } = require('../middleware');

module.exports = function(db) {
  const router = express.Router();
  function todayCount(uid) { return db.prepare("SELECT COUNT(*) AS c FROM ratings WHERE user_id=? AND date(created_at)=date('now','localtime')").get(uid).c; }
  const catMap = config.categories;
  function imgUrl(fn) { return fn&&fn.startsWith('picsum:')?`https://picsum.photos/seed/${fn.replace('picsum:','')}`:`/uploads/${fn}`; }

  router.post('/', authMiddleware, (req, res) => {
    const { imageId, score } = req.body;
    if (!imageId||!score||score<1||score>5) return res.status(400).json({error:'参数无效'});
    const img = db.prepare('SELECT id,status FROM images WHERE id=?').get(imageId);
    if (!img) return res.status(404).json({error:'图片不存在'});
    if (img.status!=='approved') return res.status(400).json({error:'该图片暂不可评分'});
    const existing = db.prepare('SELECT score FROM ratings WHERE user_id=? AND image_id=?').get(req.user.id,imageId);
    const isUpdate = !!existing;
    if (!isUpdate && todayCount(req.user.id) >= config.dailyRatingLimit)
      return res.status(429).json({error:`今日评分已达上限(${config.dailyRatingLimit}次)`,remaining:0});
    db.prepare('INSERT INTO ratings (user_id,image_id,score) VALUES (?,?,?) ON CONFLICT(user_id,image_id) DO UPDATE SET score=excluded.score').run(req.user.id,imageId,score);
    const remaining = config.dailyRatingLimit - todayCount(req.user.id);
    res.json({success:true,remaining,isUpdate,dailyLimit:config.dailyRatingLimit});
  });

  router.get('/mine', authMiddleware, (req, res) => {
    const ratings = db.prepare(`SELECT r.image_id AS imageId,r.score,i.title,i.category,i.filename FROM ratings r JOIN images i ON i.id=r.image_id WHERE r.user_id=? ORDER BY r.created_at DESC`).all(req.user.id);
    res.json(ratings.map(r=>({...r,url:imgUrl(r.filename),categoryLabel:catMap[r.category]||r.category})));
  });

  return router;
};