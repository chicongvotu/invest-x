import * as mock from './mock.js';
import newsApi from './mock-news.js';

// ============================================================================
//  Lop du lieu gia lap.
//
//  Ban nay khong con may chu API. Tung trang van goi `api.signals(...)` nhu cu,
//  nhung khong co request nao roi khoi trinh duyet: moi loi goi duoc dinh tuyen
//  vao mock.js.
//
//  Vi sao van giu nguyen hinh dang cu (duong dan, Promise, ApiError, do tre gia):
//  de giao dien khong phai viet lai, va de cac trang thai "dang tai" / "loi" /
//  "trong" van xem duoc that su chu khong bi nhay ngay sang co du lieu.
// ============================================================================

const LATENCY_MS = [120, 320];              // do tre gia lap

class ApiError extends Error {
    constructor(status, code, message, fields) {
        super(message || 'Loi khong xac dinh');
        this.name = 'ApiError';
        this.status = status;
        this.code = code || 'UNKNOWN';
        this.fields = fields || null;
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function delay() {
    const [min, max] = LATENCY_MS;
    return sleep(min + Math.random() * (max - min));
}

function parse(path) {
    const url = new URL(path, location.origin);
    return {
        pathname: url.pathname,
        query: Object.fromEntries(url.searchParams.entries())
    };
}

function requireAuth() {
    if (!mock.session.isAuthed()) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Bạn cần đăng nhập');
    }
    return mock.session.user();
}

/* --------------------------------------------------------------- GET ----- */
function handleGet(pathname, query) {
    switch (pathname) {
        case '/api/signals':      return mock.signals(query);
        case '/api/stats':        return mock.stats();
        case '/api/stats/equity': return mock.equity();

        case '/api/bot/state':    return mock.botState(query.symbol || 'ZC1!');
        case '/api/bot/overview': return mock.botOverview(query);
        case '/api/bot/config':   return mock.botConfig();
        case '/api/bot/rules':    return mock.botRules();

        case '/api/prices':
            return { items: mock.prices(String(query.symbols || '').split(',').filter(Boolean)) };

        case '/api/health':
            return { ok: true, mode: 'mock', uptimeMs: performance.now() };

        case '/api/auth/me':
            return { user: requireAuth() };
        case '/api/auth/sessions':
            requireAuth();
            return mock.sessions();
        case '/api/auth/events':
            requireAuth();
            return mock.events(Number(query.limit) || 12);
        case '/api/me/watchlist':
            return { symbols: requireAuth().watchlist || [] };

        case '/api/news/categories':
            return { categories: newsApi.categories() };

        case '/api/news/articles': {
            const filter = {
                category: query.category || undefined,
                limit: Number(query.limit) || 20,
                offset: Number(query.offset) || 0
            };
            return newsApi.list(filter);
        }
    }

    // Chi tiet mot tin tuc
    const newsDetail = pathname.match(/^\/api\/news\/articles\/(.+)$/);
    if (newsDetail) {
        const article = newsApi.getById(decodeURIComponent(newsDetail[1]));
        if (!article) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy bài viết');
        return { article };
    }

    // Chi tiet mot tin hieu
    const one = pathname.match(/^\/api\/signals\/(.+)$/);
    if (one) {
        const signal = mock.signalById(decodeURIComponent(one[1]));
        if (!signal) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy tín hiệu');
        return { signal };
    }

    throw new ApiError(404, 'NOT_FOUND', `Không có dữ liệu giả lập cho ${pathname}`);
}

/* -------------------------------------------------------------- POST ----- */
function handlePost(pathname, body) {
    switch (pathname) {
        case '/api/backtest':
            return mock.backtest(body || {});

        case '/api/auth/login':
            return { user: mock.session.login({ email: (body || {}).email }) };

        case '/api/auth/register':
            return { user: mock.session.login(body || {}) };

        case '/api/auth/logout':
            mock.session.logout();
            return { ok: true };

        case '/api/auth/change-password':
            requireAuth();
            return { ok: true, revokedSessions: 2 };

        case '/api/bot/scan':
        case '/api/bot/evaluate':
            return { ok: true, scanned: mock.SYMBOLS.length };

        case '/api/news/articles': {
            requireAuth();
            const article = newsApi.create(body || {});
            return { article };
        }
    }

    throw new ApiError(404, 'NOT_FOUND', `Không có dữ liệu giả lập cho ${pathname}`);
}

/* --------------------------------------------------------------- PUT ----- */
function handlePut(pathname, body) {
    switch (pathname) {
        case '/api/auth/profile':
            requireAuth();
            return { user: mock.session.update({ displayName: (body || {}).displayName || '' }) };

        case '/api/me/watchlist': {
            requireAuth();
            const symbols = (body || {}).symbols || [];
            return { symbols: mock.session.update({ watchlist: symbols }).watchlist };
        }

        case '/api/me/alerts': {
            requireAuth();
            const alertPrefs = {
                enabled: Boolean((body || {}).enabled),
                minStrength: (body || {}).minStrength || 'STRONG'
            };
            return { alertPrefs: mock.session.update({ alertPrefs }).alertPrefs };
        }
    }

    // Cap nhat tin tuc
    const newsUpdate = pathname.match(/^\/api\/news\/articles\/(.+)$/);
    if (newsUpdate) {
        requireAuth();
        const article = newsApi.update(decodeURIComponent(newsUpdate[1]), body || {});
        if (!article) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy bài viết');
        return { article };
    }

    throw new ApiError(404, 'NOT_FOUND', `Không có dữ liệu giả lập cho ${pathname}`);
}

/* ------------------------------------------------------------ DELETE ----- */
function handleDelete(pathname) {
    const revoke = pathname.match(/^\/api\/auth\/sessions\/(.+)$/);
    if (revoke) {
        requireAuth();
        return mock.revokeSession(decodeURIComponent(revoke[1]));
    }

    const newsDelete = pathname.match(/^\/api\/news\/articles\/(.+)$/);
    if (newsDelete) {
        requireAuth();
        const article = newsApi.delete(decodeURIComponent(newsDelete[1]));
        if (!article) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy bài viết');
        return { article };
    }

    throw new ApiError(404, 'NOT_FOUND', `Không có dữ liệu giả lập cho ${pathname}`);
}

async function request(path, options = {}) {
    const { method = 'GET', body = null } = options;
    const { pathname, query } = parse(path);

    await delay();

    if (method === 'GET')    return handleGet(pathname, query);
    if (method === 'POST')   return handlePost(pathname, body);
    if (method === 'PUT')    return handlePut(pathname, body);
    if (method === 'DELETE') return handleDelete(pathname);

    throw new ApiError(405, 'METHOD_NOT_ALLOWED', `Không hỗ trợ ${method}`);
}

export const api = {
    get:    (path, opts) => request(path, { ...opts, method: 'GET' }),
    post:   (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
    put:    (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
    delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),

    signals: (params = {}) => request('/api/signals?' + new URLSearchParams(params)),
    stats:   (params = {}) => request('/api/stats?' + new URLSearchParams(params)),
    equity:  (params = {}) => request('/api/stats/equity?' + new URLSearchParams(params)),
    botState:    (symbol) => request('/api/bot/state?symbol=' + encodeURIComponent(symbol)),
    botOverview: (params = {}) => request('/api/bot/overview?' + new URLSearchParams(params)),
    botRules:    () => request('/api/bot/rules'),
    health:      () => request('/api/health')
};

// ---------------------------------------------------------------------------
//  Luong truc tiep gia lap.
//
//  Truoc day la SSE tu may chu. Gio chi la mot bo hen gio: bao "truc tiep" roi
//  thinh thoang bao co tin hieu moi, du de thay dau cham xanh va viec tu tai
//  lai bang van chay dung.
// ---------------------------------------------------------------------------
export function connectStream(handlers = {}) {
    let closed = false;

    const emit = (name, payload) => {
        if (closed) return;
        if (handlers[name]) handlers[name](payload);
        if (handlers.onAny) handlers.onAny(name, payload);
    };

    // Doi mot nhip roi moi bao "truc tiep", neu khong chi bao trang thai da
    // sang xanh truoc ca khi trang ve xong - nhin nhu no khong bao gio ket noi.
    const hello = setTimeout(() => {
        if (closed) return;
        if (handlers.onState) handlers.onState('live');
        emit('connected', { mode: 'mock' });
    }, 400);

    const beat = setInterval(() => {
        if (handlers.onState) handlers.onState('live');
    }, 20000);

    const tick = setInterval(() => {
        const symbol = mock.SYMBOLS[Math.floor(Math.random() * mock.SYMBOLS.length)];
        emit(Math.random() < 0.5 ? 'signal:update' : 'snapshot', { symbol });
    }, 45000);

    return {
        close() {
            closed = true;
            clearTimeout(hello);
            clearInterval(beat);
            clearInterval(tick);
        }
    };
}

export { ApiError };
