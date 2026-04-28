const sqlite = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('./config');

function initDatabase() {
  const dbPath = path.join(config.dataDir, 'pixelrate.db');
  const db = sqlite(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      filename TEXT NOT NULL,
      uploader_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      reject_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
    CREATE TABLE IF NOT EXISTS ratings (
      user_id INTEGER NOT NULL REFERENCES users(id),
      image_id INTEGER NOT NULL REFERENCES images(id),
      score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (user_id, image_id)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id INTEGER NOT NULL REFERENCES images(id),
      reporter_id INTEGER NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  seed(db);
  return db;
}

function seed(db) {
  const c = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (c > 0) return;
  console.log('初始化种子数据...');
  const hash = bcrypt.hashSync('123456', 10);
  [['风景猎人','13800000001',hash,'风'],['夜行者','13800000002',hash,'夜'],
   ['光影师','13800000003',hash,'光'],['甜品控','13800000004',hash,'甜'],
   ['抽象派','13800000005',hash,'抽']
  ].forEach(u => db.prepare('INSERT INTO users (username,phone,password_hash,avatar) VALUES (?,?,?,?)').run(...u));

  const ins = db.prepare('INSERT INTO images (title,category,filename,uploader_id,status) VALUES (?,?,?,?,?)');
  [['晨曦中的山谷','landscape',1],['东京霓虹夜','street',2],['午后的猫','animal',3],
   ['抹茶千层','food',4],['光影人像','portrait',5],['色彩碰撞','abstract',1],
   ['冰川倒影','landscape',2],['老巷烟火','street',3],['飞鸟逐日','animal',4],
   ['深夜拉面','food',5],['逆光少女','portrait',1],['几何迷宫','abstract',2]
  ].forEach(([t,c,uid]) => ins.run(t, c, `picsum:${t.toLowerCase().replace(/\s/g,'-')}`, uid, 'approved'));

  const ir = db.prepare('INSERT OR IGNORE INTO ratings (user_id,image_id,score) VALUES (?,?,?)');
  for (let i=1;i<=12;i++) for (let u=1;u<=5;u++) ir.run(u,i,Math.floor(Math.random()*3)+3);
  console.log('完成！演示账号：风景猎人 / 13800000001');
}

module.exports = { initDatabase };