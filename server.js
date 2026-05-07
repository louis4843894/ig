const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'db', 'data.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('資料庫連線失敗:', err.message);
    process.exit(1);
  }
});

function runStatements(sqlContent) {
  const statements = sqlContent
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let index = 0;

      const runNext = () => {
        if (index >= statements.length) {
          resolve();
          return;
        }

        db.run(statements[index], (err) => {
          if (err) {
            reject(err);
            return;
          }
          index += 1;
          runNext();
        });
      };

      runNext();
    });
  });
}

async function initDb() {
  const schemaPath = path.join(__dirname, 'db', 'schema.sql');
  const seedPath = path.join(__dirname, 'db', 'seed.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  await runStatements(schemaSql);
  await runStatements(seedSql);
}

app.use(express.static(__dirname));

app.get('/api/ig-link/:code', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();

  if (!code) {
    res.status(400).json({ message: '請輸入代碼。' });
    return;
  }

  db.get(
    'SELECT code, name, ig_url FROM ig_profiles WHERE code = ? LIMIT 1',
    [code],
    (err, row) => {
      if (err) {
        res.status(500).json({ message: '查詢失敗，請稍後再試。' });
        return;
      }

      if (!row) {
        res.status(404).json({ message: '查無此代碼，請確認後再試。' });
        return;
      }

      res.json({
        code: row.code,
        name: row.name,
        igUrl: row.ig_url,
      });
    }
  );
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('資料庫初始化失敗:', err.message);
    process.exit(1);
  });
