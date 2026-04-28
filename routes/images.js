const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { authMiddleware, apiLimiter } = require('../middleware');
const { STATUS, moderateImage } = require('../moderation');

module.exports = function(db) {
  const router = express.Router();
  const UPLOAD_DIR = path.join(config.dataDir, 'uploads');
  const catMap = config.categories;
  function imgUrl(fn) {
    if (fn && fn.startsWith('picsum:')) return `https://picsum.photos/seed/${fn.replace('picsum:','')}`;
    return `/uploads/${fn}`;
  }

  router.get('/', apiLimiter, (req, res) => {
    const { category='all', page=1, limit=12 } = req.query;
    const offset = (Math.max(1,+page)-1)*limit;
    const safeLimit = Math.min(Math.max(1,+limit),50);
    let where="WHERE i.status='approved'", params=[];
    if (category!=='all') { where+=" AND i.category=?"; params.push(category); }
    const images = db.prepare(`SELECT i.id,i.title,i.category,i.filename,i.created_at,u.username AS uploader,
      COALESCE(ROUND(AVG(r.score),1),0) AS avgScore, COUNT(r.score) AS ratingCount
      FROM images i JOIN users u ON u.id=i.uploader_id LEFT JOIN ratings r ON r.image_id=i.id
      ${where} GROUP BY i.id ORDER BY i.created_at DESC LIMIT ? OFFSET ?`).all(...params, safeLimit, offset);
    const {count} = db.prepare(`SELECT COUNT(*) AS count FROM images i ${where}`).get(...params);
    res.json({ images: images.map(i=>({...i,url:imgUrl(i.filename),categoryLabel:catMap[i.category]||i.category})), total:count, page:+page, totalPages:Math.ceil(count/safeLimit) });
  });

  router.get('/:id', apiLimiter, (req, res) => {
    const img = db.prepare(`SELECT i.*, u.username AS uploader, COALESCE(ROUND(AVG(r.score),1),0) AS avgScore, COUNT(r.score) AS ratingCount
      FROM images i JOIN users u ON u.id=i.uploader_id LEFT JOIN ratings r ON r.image_id=i.id WHERE i.id=? GROUP BY i.id`).get(req.params.id);
    if (!img) return res.status(404).json({error:'图片不存在'});
    if (img.status !== 'approved') {
      const jwt = require('jsonwebtoken');
      let user = null;
      try { user = jwt.verify(req.headers.authorization?.split(' ')[1], config.jwtSecret); } catch {}
      const { isAdmin } = require('../moderation');
      if (!user || (img.uploader_id !== user.id && !isAdmin(user))) return res.status(404).json({error:'图片不存在'});
    }
    const distRows = db.prepare('SELECT score,COUNT(*) AS count FROM ratings WHERE image_id=? GROUP BY score').all(img.id);
    const distribution = {1:0,2:0,3:0,4:0,5:0};
    distRows.forEach(d => distribution[d.score] = d.count);
    res.json({...img, url:imgUrl(img.filename), categoryLabel:catMap[img.category]||img.category, distribution});
  });

  const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: config.maxImageSize },
    fileFilter: (_,file,cb) => { cb(null, config.allowedImageTypes.includes(path.extname(file.originalname).toLowerCase())); }
  });

  router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({error:'请选择图片'});
      const {title,category}=req.body;
      if (!title||!title.trim()) return res.status(400).json({error:'请输入标题'});
      const cat = Object.keys(catMap).includes(category)?category:'landscape';
      const ext = path.extname(req.file.originalname).toLowerCase()||'.jpg';
      const filename = `${Date.now()}-${req.user.id}${ext}`;
      fs.renameSync(req.file.path, path.join(UPLOAD_DIR, filename));
      const r = db.prepare('INSERT INTO images (title,category,filename,uploader_id,status) VALUES (?,?,?,?,?)').run(title.trim(),cat,filename,req.user.id,STATUS.PENDING);
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
      moderateImage(imageUrl).then(result => {
        db.prepare('UPDATE images SET status=?,reject_reason=? WHERE id=?').run(result.status, result.reason, r.lastInsertRowid);
        console.log(`审核结果 #${r.lastInsertRowid}: ${result.status}`);
      }).catch(e => console.error('审核出错:', e));
      res.json({ id:r.lastInsertRowid, title:title.trim(), status:STATUS.PENDING, message:'已上传，审核中' });
    } catch(e) { console.error(e); if(req.file&&fs.existsSync(req.file.path))fs.unlinkSync(req.file.path); res.status(500).json({error:'上传失败'}); }
  });

  router.delete('/:id', authMiddleware, (req, res) => {
    const img = db.prepare('SELECT * FROM images WHERE id=?').get(req.params.id);
    if (!img) return res.status(404).json({error:'图片不存在'});
    if (img.uploader_id!==req.user.id) return res.status(403).json({error:'只能删除自己的图片'});
    if (!img.filename.startsWith('picsum:')) { const fp=path.join(UPLOAD_DIR,img.filename); if(fs.existsSync(fp))fs.unlinkSync(fp); }
    db.prepare('DELETE FROM ratings WHERE image_id=?').run(img.id);
    db.prepare('DELETE FROM reports WHERE image_id=?').run(img.id);
    db.prepare('DELETE FROM images WHERE id=?').run(img.id);
    res.json({success:true});
  });

  router.post('/:id/report', authMiddleware, (req, res) => {
    const img = db.prepare('SELECT id FROM images WHERE id=?').get(req.params.id);
    if (!img) return res.status(404).json({error:'图片不存在'});
    if (db.prepare('SELECT id FROM reports WHERE image_id=? AND reporter_id=?').get(+req.params.id,req.user.id))
      return res.status(400).json({error:'您已举报过'});
    db.prepare('INSERT INTO reports (image_id,reporter_id,reason) VALUES (?,?,?)').run(+req.params.id,req.user.id,req.body.reason||'内容违规');
    res.json({success:true});
  });

  return router;
};