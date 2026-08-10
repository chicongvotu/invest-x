const express = require('express');
const path = require('path');

const pageRoutes = require('./routes/page.routes');
const { prices } = require('./backend/mock-data');

// -----------------------------------------------------------------------------
//  Ban giao dien thuan: khong backend, khong CSDL, khong tinh toan.
//  Server chi lam mot viec: ghep partial roi tra HTML tinh + tai nguyen public/.
//  Mock data duoc serve tu backend (/api/prices) cho Vercel compatibility.
// -----------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3019;

const app = express();
app.use(express.json());

// API routes (before static files + page routes)
app.get('/api/prices', (req, res) => {
    const symbols = String(req.query.symbols || '').split(',').filter(Boolean);
    res.json({ items: prices(symbols) });
});

// Trang HTML truoc, vi chung duoc ghep partial o server (routes/page.routes.js).
// De express.static chay truoc thi no se tra file tho con nguyen {{header}}.
app.use(pageRoutes.router);

// Tai nguyen tinh: css / js / assets. index:false de "/" khong bi static gianh mat.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.use(pageRoutes.notFoundPage);

function start() {
    const server = app.listen(PORT, () => {
        console.log(`[server] Chay tai http://localhost:${PORT}`);
        console.log('[server] Che do mock: toan bo du lieu la gia lap phia trinh duyet');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[server] Cong ${PORT} dang bi tien trinh khac chiem.`);
            console.error(`         Tim va dung no: lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
        } else {
            console.error('[server] Khong mo duoc cong:', err.message);
        }
        process.exit(1);
    });
}

if (require.main === module) start();

module.exports = { app, start };
