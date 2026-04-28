const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { authMiddleware } = require('../middleware');

module.exports = function(db) {
  const router = express.Router();
  const AVATAR_DIR = path.join(config.dataDir, 'avatars');
  const catMap = config.categories;
  function imgUrl(fn) { return fn&&fn.startsWith('picsum:')?`https://picsum.photos/seed/${fn.replace('picsum:','')}`:`/uploads/${fn}`; }
  function signToken(u) { return jwt.sign({id:u.id,username:u.username,avatar:u.avatar},config.jwtSecret,{expiresIn:config.jwtExpiresIn}); }
  function buildUser(u) { return {id:u.id,username:u.username,phone:u.phone,avatar:u.avatar,avatarUrl:u.avatar_url||'',createdAt:u.created_at}; }
  function todayCount(uid) { return db.prepare("SELECT COUNT(*) AS c FROM ratings WHERE user_id=? AND date(created_at)=date('now','localtime')").get(uid).c; }

  router.put('/profile', authMiddleware, (req, res) => {
    const {username}=req.body; if(!username||username.trim().length<3||username.trim().length>20) return res.status(400).json({error:'用户名需3-20个字符'});
    const t=username.trim();
    if(db.prepare('SELECT id FROM users WHERE username=? AND id!=?').get(t,req.user.id)) return res.status(409).json({error:'用户名已占用'});
    db.prepare('UPDATE users SET username=?,avatar=? WHERE id=?').run(t,t.charAt(0).toUpperCase(),req.user.id);
    const user=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    res.json({token:signToken(user),user:buildUser(user)});
  });

  const avatarUpload = multer({ dest:AVATAR_DIR, limits:{fileSize:config.maxAvatarSize},
    fileFilter:(_,f,cb)=>{cb(null,config.allowedAvatarTypes.includes(path.extname(f.originalname).toLowerCase()));}
  });
  router.post('/avatar', authMiddleware, avatarUpload.single('avatar'), (req, res) => {
    try {
      if(!req.file) return res.status(400).json({error:'请选择头像'});
      const ext=path.extname(req.file.originalname).toLowerCase()||'.jpg';
      const filename=`avatar-${req.user.id}-${Date.now()}${ext}`;
      const old=db.prepare('SELECT avatar_url FROM users WHERE id=?').get(req.user.id);
      if(old?.avatar_url){const op=path.join(AVATAR_DIR,path.basename(old.avatar_url));if(fs.existsSync(op))fs.unlinkSync(op);}
      fs.renameSync(req.file.path,path.join(AVATAR_DIR,filename));
      db.prepare('UPDATE users SET avatar_url=? WHERE id=?').run(`/avatars/${filename}`,req.user.id);
      const user=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
      res.json({token:signToken(user),user:buildUser(user)});
    } catch(e){console.error(e);if(req.file&&fs.existsSync(req.file.path))fs.unlinkSync(req.file.path);res.status(500).json({error:'头像上传失败'});}
  });

  router.get('/uploads', authMiddleware, (req, res) => {
    const images=db.prepare(`SELECT i.id,i.title,i.category,i.filename,i.status,i.created_at,
      COALESCE(ROUND(AVG(r.score),1),0) AS avgScore, COUNT(r.score) AS ratingCount
      FROM images i LEFT JOIN ratings r ON r.image_id=i.id WHERE i.uploader_id=? GROUP BY i.id ORDER BY i.created_at DESC`).all(req.user.id);
    res.json(images.map(i=>({...i,url:imgUrl(i.filename),categoryLabel:catMap[i.category]||i.category})));
  });

  router.get('/profile', authMiddleware, (req, res) => {
    const user=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if(!user) return res.status(404).json({error:'用户不存在'});
    const stats=db.prepare(`SELECT (SELECT COUNT(*) FROM ratings WHERE user_id=?) AS ratedCount,
      (SELECT COUNT(*) FROM images WHERE uploader_id=?) AS uploadCount,
      (SELECT COALESCE(ROUND(AVG(score),1),0) FROM ratings WHERE user_id=?) AS avgGiven`).get(req.user.id,req.user.id,req.user.id);
    const todayRated=todayCount(req.user.id);
    const distRows=db.prepare('SELECT score,COUNT(*) AS count FROM ratings WHERE user_id=? GROUP BY score').all(req.user.id);
    const distribution={1:0,2:0,3:0,4:0,5:0}; distRows.forEach(d=>distribution[d.score]=d.count);
    res.json({...buildUser(user),...stats,distribution,dailyLimit:config.dailyRatingLimit,todayRated,remaining:config.dailyRatingLimit-todayRated});
  });

  router.get('/config', (req, res) => {
    res.json({dailyRatingLimit:config.dailyRatingLimit,categories:config.categories,sponsor:config.sponsor,feedback:config.feedback,admins:config.moderation?.admins||[]});
  });

  return router;
};