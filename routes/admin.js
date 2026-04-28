const express = require('express');
const { isAdmin } = require('../moderation');
const { authMiddleware } = require('../middleware');

module.exports = function(db) {
  const router = express.Router();
  router.use(authMiddleware, (req, res, next) => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: '无管理权限' });
    next();
  });
  function imgUrl(fn) { return fn&&fn.startsWith('picsum:')?`https://picsum.photos/seed/${fn.replace('picsum:','')}`:`/uploads/${fn}`; }

  router.get('/pending', (req, res) => {
    const images=db.prepare(`SELECT i.*,u.username AS uploader FROM images i JOIN users u ON u.id=i.uploader_id
      WHERE i.status='pending' ORDER BY i.created_at ASC LIMIT 50`).all();
    res.json(images.map(i=>({...i,url:imgUrl(i.filename)})));
  });

  router.get('/reported', (req, res) => {
    const images=db.prepare(`SELECT i.*,u.username AS uploader, rp.reason AS report_reason, ru.username AS reporter_name
      FROM images i JOIN users u ON u.id=i.uploader_id JOIN reports rp ON rp.image_id=i.id
      JOIN users ru ON ru.id=rp.reporter_id WHERE i.status='approved' ORDER BY rp.created_at DESC LIMIT 50`).all();
    res.json(images.map(i=>({...i,url:imgUrl(i.filename)})));
  });

  router.post('/approve/:id', (req, res) => {
    db.prepare("UPDATE images SET status='approved',reject_reason='' WHERE id=?").run(req.params.id);
    res.json({success:true});
  });

  router.post('/reject/:id', (req, res) => {
    db.prepare("UPDATE images SET status='rejected',reject_reason=? WHERE id=?").run(req.body.reason||'内容违规',req.params.id);
    res.json({success:true});
  });

  router.get('/stats', (req, res) => {
    const pending=db.prepare("SELECT COUNT(*) AS c FROM images WHERE status='pending'").get().c;
    const reported=db.prepare('SELECT COUNT(*) AS c FROM reports').get().c;
    res.json({pending,reported});
  });

  return router;
};