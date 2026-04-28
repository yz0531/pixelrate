const config = require('./config');
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');
const ratingRoutes = require('./routes/ratings');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const UPLOAD_DIR = path.join(config.dataDir, 'uploads');
const AVATAR_DIR = path.join(config.dataDir, 'avatars');
[config.dataDir, UPLOAD_DIR, AVATAR_DIR, path.join(__dirname, 'public', 'images')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const db = initDatabase();
const app = express();

app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/avatars', express.static(AVATAR_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use('/api/auth', authRoutes(db));
app.use('/api/images', imageRoutes(db));
app.use('/api/ratings', ratingRoutes(db));
app.use('/api/users', userRoutes(db));
app.use('/api/admin', adminRoutes(db));

app.get('/api/stats', (req, res) => {
  res.json({
    imageCount: db.prepare("SELECT COUNT(*) AS c FROM images WHERE status='approved'").get().c,
    userCount: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
    ratingCount: db.prepare('SELECT COUNT(*) AS c FROM ratings').get().c
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.port, '0.0.0.0', () => {
  console.log('\n  PixelRate 已启动 → http://localhost:' + config.port + '\n');
});