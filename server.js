const express = require('express');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_ANON_KEY，請檢查 .env 設定。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(express.static(__dirname));

app.get('/api/ig-link/:code', async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();

  if (!code) {
    res.status(400).json({ message: '請輸入代碼。' });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('ig_profiles')
      .select('code, name, ig_url')
      .eq('code', code)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      res.status(404).json({ message: '查無此代碼，請確認後再試。' });
      return;
    }

    res.json({
      code: data.code,
      name: data.name,
      igUrl: data.ig_url,
    });
  } catch (err) {
    console.error('查詢失敗:', err.message);
    res.status(500).json({ message: '查詢失敗，請稍後再試。' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
