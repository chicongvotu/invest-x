const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

// -----------------------------------------------------------------------------
//  Render trang tinh co ghep partial.
//
//  Vi sao khong nhoi header bang JS phia trinh duyet: Google va cac trinh doc
//  man hinh se nhan duoc HTML thieu dieu huong, va trang bi nhay khi tai.
//  Ghep o server thi van la HTML that, khong can build step, khong lap markup.
// -----------------------------------------------------------------------------

const VIEWS = path.join(__dirname, '..', 'views');

function readFile(relative) {
    return fs.readFileSync(path.join(VIEWS, relative), 'utf8');
}

function render(file, vars = {}) {
    // Doc lai moi lan: ban mock nay dung de xem giao dien, sua file la thay ngay.
    let html = readFile(file)
        .replace('{{header}}', readFile('partials/header.html'))
        .replace('{{footer}}', readFile('partials/footer.html'));

    for (const [name, value] of Object.entries(vars)) {
        html = html.replaceAll(`{{${name}}}`, value);
    }

    return html;
}

function page(file, vars = {}) {
    return (req, res, next) => {
        try {
            res.type('html').send(render(file, vars));
        } catch (err) {
            next(err);
        }
    };
}

const router = express.Router();

router.get('/', page('index.html'));

// Tin tuc: hoan sang Phase 8, van giu tren menu theo yeu cau tai lieu
router.get('/news', page('coming-soon.html', {
    pageTitle: 'Tin tức thị trường — SignalFlow',
    heading: 'Tin tức',
    message: 'Chuyên mục tin tức đang được xây dựng và sẽ ra mắt trong bản cập nhật tới.'
}));

router.get('/chart', page('chart.html'));
router.get('/bot',   page('bot.html'));

// --- Tai khoan ---
// Khong con phien dang nhap that: trang thai dang nhap la gia lap, do
// public/js/mock.js giu trong localStorage. Server tra thang trang.
router.get('/login',    page('login.html'));
router.get('/register', page('register.html'));
router.get('/account',  page('account.html'));

// Dang xuat that su xay ra o trinh duyet (layout.js xoa co dang nhap gia lap)
router.get('/logout', (req, res) => res.redirect('/'));

// Trang chu chi co MOT dia chi, tranh trung lap noi dung khi SEO
router.get('/index.html', (req, res) => res.redirect(301, '/'));

// -----------------------------------------------------------------------------
//  SEO. Chi liet ke trang CO NOI DUNG THAT va dat robots=index.
//  /login va /account dat noindex nen khong duoc dua vao sitemap - khai bao
//  mot dang o sitemap va mot dang o meta la tin hieu mau thuan voi Google.
//  /news hien la trang "Sap ra mat", cung khong dua vao.
// -----------------------------------------------------------------------------
const PUBLIC_PAGES = [
    { path: '/',         changefreq: 'hourly', priority: '1.0' },
    { path: '/chart',    changefreq: 'hourly', priority: '0.9' },
    { path: '/bot',      changefreq: 'daily',  priority: '0.9' },
    { path: '/register', changefreq: 'monthly', priority: '0.6' }
];

function siteOrigin(req) {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host')}`;
}

router.get('/sitemap.xml', (req, res) => {
    const origin = siteOrigin(req);
    const today = new Date().toISOString().slice(0, 10);

    const body = '<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + PUBLIC_PAGES.map(p =>
            `  <url>\n    <loc>${origin}${p.path}</loc>\n`
            + `    <lastmod>${today}</lastmod>\n`
            + `    <changefreq>${p.changefreq}</changefreq>\n`
            + `    <priority>${p.priority}</priority>\n  </url>`
        ).join('\n')
        + '\n</urlset>\n';

    res.type('application/xml').send(body);
});

router.get('/robots.txt', (req, res) => {
    const origin = siteOrigin(req);
    res.type('text/plain').send([
        'User-agent: *',
        'Allow: /',
        '',
        '# Trang rieng tu khong can thu thap',
        'Disallow: /account',
        'Disallow: /login',
        '',
        `Sitemap: ${origin}/sitemap.xml`,
        ''
    ].join('\n'));
});

function notFoundPage(req, res) {
    res.status(404).type('html').send(render('404.html'));
}

module.exports = { router, notFoundPage, render };
