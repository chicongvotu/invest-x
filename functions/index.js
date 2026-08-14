const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Spike: API rỗng chỉ trả về {ok:true, spike: 'works'}
// Dùng để test hạ tầng (Vercel rewrite + Cloud Function + domain nối với nhau)
app.get('/news', (req, res) => {
  res.json({ ok: true, spike: 'works' });
});

// Export Cloud Function (gen2)
// URL khi deploy sẽ là: https://asia-southeast1-<PROJECT_ID>.cloudfunctions.net/api
exports.api = onRequest({
  region: 'asia-southeast1',
  minInstances: 0,
  memory: '256MiB',
  cors: false  // CORS xử lý bằng middleware Express ở trên
}, app);
