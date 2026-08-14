const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Spike: API rỗng chỉ trả về {ok:true, spike: 'works'}
app.get('/news', (req, res) => {
  res.json({ ok: true, spike: 'works' });
});

// Export Cloud Function (gen2)
exports.api = onRequest({
  region: 'asia-southeast1',
  minInstances: 0,
  memory: '256MiB',
  cors: false
}, app);
