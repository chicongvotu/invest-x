// ============================================================================
//  Kho du lieu gia lap.
//
//  Ban nay khong con backend: khong CSDL, khong quet thi truong, khong cham
//  diem SMC. Moi con so tren man hinh sinh ra tai day de xem va sua giao dien.
//
//  Nguyen tac: SO PHAI ON DINH. Dung Math.random() truc tiep thi moi lan doi
//  tab la ca bang nhay so khac, nhin nhu he thong dang hong. Nen dung mot bo
//  sinh so gia ngau nhien co hat giong: cung symbol -> cung ket qua.
//  Rieng gia thi truong duoc phep dao nhe theo thoi gian cho co cam giac song.
// ============================================================================

/* ------------------------------------------------------ So gia ngau nhien - */
function seedOf(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

// mulberry32: nho, du tot cho du lieu trung bay
function rng(seed) {
    let a = typeof seed === 'string' ? seedOf(seed) : seed >>> 0;
    return function next() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const pick = (r, list) => list[Math.floor(r() * list.length)];
const between = (r, min, max) => min + r() * (max - min);
const intBetween = (r, min, max) => Math.floor(between(r, min, max + 1));
const round = (n, digits = 2) => Number(n.toFixed(digits));

/* --------------------------------------------------------- Hop dong ------- */
export const INSTRUMENTS = {
    'ZC1!': { name: 'Ngô kỳ hạn gần',      base: 468.25, tick: 0.25 },
    'ZC2!': { name: 'Ngô kỳ hạn xa',       base: 482.50, tick: 0.25 },
    'ZW1!': { name: 'Lúa mì kỳ hạn gần',   base: 561.75, tick: 0.25 },
    'ZW2!': { name: 'Lúa mì kỳ hạn xa',    base: 578.00, tick: 0.25 },
    'ZS1!': { name: 'Đậu tương kỳ hạn gần', base: 1042.50, tick: 0.25 },
    'ZS2!': { name: 'Đậu tương kỳ hạn xa',  base: 1058.75, tick: 0.25 },
    'ZM1!': { name: 'Khô đậu kỳ hạn gần',  base: 312.40, tick: 0.10 },
    'ZM2!': { name: 'Khô đậu kỳ hạn xa',   base: 318.90, tick: 0.10 },
    'ZL1!': { name: 'Dầu đậu kỳ hạn gần',  base: 46.82, tick: 0.01 },
    'ZL2!': { name: 'Dầu đậu kỳ hạn xa',   base: 47.55, tick: 0.01 }
};

export const SYMBOLS = Object.keys(INSTRUMENTS);

function instrument(symbol) {
    const known = INSTRUMENTS[symbol];
    if (known) return known;
    // Symbol la nguoi dung tu go vao: van phai co gia, khong duoc de trong
    const r = rng(symbol);
    return { name: '', base: round(between(r, 20, 1200), 2), tick: 0.01 };
}

/* ------------------------------------------------------------- Gia -------- */
// Gia dao quanh moc co dinh theo mot song sin cham + nhieu nho. Khong dung
// random thuan: gia se nhay loan xa giua hai lan poll, khong giong thi truong.
export function priceOf(symbol) {
    const info = instrument(symbol);
    const r = rng(symbol + ':price');
    const phase = r() * Math.PI * 2;
    const amplitude = info.base * between(r, 0.004, 0.018);

    const t = Date.now() / 60000;                     // doi cham theo phut
    const wave = Math.sin(phase + t / 7) * amplitude;
    const noise = Math.sin(phase * 3 + t / 1.3) * amplitude * 0.15;

    const price = info.base + wave + noise;
    const changePct = ((price - info.base) / info.base) * 100;

    return {
        symbol,
        name: info.name,
        price: round(price, info.tick < 0.1 ? 2 : 2),
        changePct: round(changePct, 2),
        asOf: Date.now() - 60000
    };
}

export function prices(symbols) {
    return symbols.map(s => priceOf(String(s).toUpperCase()));
}

/* ---------------------------------------------------- Quyet dinh SMC ------ */
const TRENDS = ['BULLISH', 'BEARISH', 'NEUTRAL'];
const ZONES = ['DEMAND', 'SUPPLY', 'NONE'];
const PD_ZONES = ['PREMIUM', 'DISCOUNT', 'EQUILIBRIUM'];
const VETOS = ['NO_ZONE', 'IN_EQUILIBRIUM', 'WRONG_PD_ZONE', 'COUNTER_TREND', 'NO_CONFIRMATION', 'LOW_SCORE'];

export const WEIGHTS = { zoneInside: 40, premiumDiscount: 20, trend: 20, bos: 20, choch: 15 };

// Diem duoc cong tu chinh cac tieu chi, khong bia roi hien mau thuan voi
// bang chi tiet ben duoi no.
function decisionFor(symbol, salt = '') {
    const r = rng(symbol + ':decision' + salt);

    const zone = pick(r, ZONES);
    const pdZone = pick(r, PD_ZONES);
    const h4 = pick(r, TRENDS);
    const h1 = r() < 0.6 ? h4 : pick(r, TRENDS);
    const m15 = r() < 0.5 ? h4 : pick(r, TRENDS);

    const breakdown = {
        zone:            zone === 'NONE' ? 0 : WEIGHTS.zoneInside,
        premiumDiscount: pdZone === 'EQUILIBRIUM' ? 0 : (r() < 0.7 ? WEIGHTS.premiumDiscount : 0),
        trend:           h4 === 'NEUTRAL' ? 0 : (r() < 0.65 ? WEIGHTS.trend : 0),
        confirmation:    r() < 0.55 ? WEIGHTS.bos : 0
    };

    const score = breakdown.zone + breakdown.premiumDiscount + breakdown.trend + breakdown.confirmation;
    const mtfAligned = h4 === h1 && h1 === m15 && h4 !== 'NEUTRAL';

    let signal = 'WAIT';
    let strength = 'NONE';
    let vetoReason = null;

    // Huong lay tu vung truoc, xu huong H4 chi dung khi vung khong noi gi:
    // hien "MUA" canh "Vung cung" la mau thuan ngay tren cung mot the.
    const bearish = zone === 'SUPPLY' || (zone === 'NONE' && h4 === 'BEARISH');

    if (score >= 80) {
        signal = bearish ? 'SELL' : 'BUY';
        strength = score >= 90 ? 'VERY_STRONG' : 'STRONG';
    } else if (score >= 60) {
        signal = bearish ? 'SELL' : 'BUY';
        strength = 'MEDIUM';
    } else if (score >= 40) {
        signal = bearish ? 'WATCH_SELL' : 'WATCH_BUY';
        strength = 'NONE';
        vetoReason = breakdown.confirmation === 0 ? 'NO_CONFIRMATION' : 'LOW_SCORE';
    } else {
        vetoReason = zone === 'NONE' ? 'NO_ZONE'
            : pdZone === 'EQUILIBRIUM' ? 'IN_EQUILIBRIUM'
            : pick(r, VETOS);
    }

    return {
        decision: {
            signal, strength, score, zone, pdZone, mtfAligned,
            scoreBreakdown: breakdown,
            vetoReason
        },
        trends: { h4, h1, m15 }
    };
}

/* ---------------------------------------------------------- Tin hieu ------ */
// TP1_HIT nam ben "dang mo": cham TP1 thi lenh van con chay, chi la stop loss
// da doi ve hoa von. Xep no vao nhom da dong thi no rot khoi ca hai bo loc.
const OPEN_STATUS = ['WATCHING', 'PENDING', 'RUNNING', 'TP1_HIT'];
const CLOSED_STATUS = ['TP2', 'SL', 'BREAKEVEN', 'EXPIRED', 'CANCELLED'];

const REALIZED_R = { TP2: 2, TP1_HIT: 1, BREAKEVEN: 0, SL: -1, EXPIRED: 0, CANCELLED: 0 };

function makeSignal(symbol, index) {
    const r = rng(`${symbol}:signal:${index}`);
    const info = instrument(symbol);
    const { decision, trends } = decisionFor(symbol, ':' + index);

    const side = decision.signal.includes('SELL') ? 'SELL' : 'BUY';
    const isWatch = decision.signal.startsWith('WATCH');
    const entry = round(info.base * between(r, 0.985, 1.015), 2);
    const risk = round(entry * between(r, 0.006, 0.016), 2);

    // Rut ket qua co trong so chu khong boc deu: boc deu thi so lenh thang va
    // thua ngang nhau, ty le thang tut ve gan 30% va bang hieu suat trong nhu
    // he thong dang lo - khong hop de trung bay.
    const roll = r();
    const status = r() < 0.45
        ? pick(r, OPEN_STATUS)
        : roll < 0.42 ? 'TP2'
        : roll < 0.60 ? 'BREAKEVEN'
        : roll < 0.90 ? 'SL'
        : roll < 0.96 ? 'EXPIRED' : 'CANCELLED';
    const settled = CLOSED_STATUS.includes(status) || status === 'TP1_HIT';

    return {
        id: `${symbol}-${index}`,
        symbol,
        timeframe: pick(r, ['15m', '1h', '4h']),
        side,
        isWatch,
        strength: decision.strength,
        score: decision.score,
        zone: decision.zone,
        pdZone: decision.pdZone,
        trends,
        entry,
        sl:  side === 'BUY' ? round(entry - risk, 2) : round(entry + risk, 2),
        tp1: side === 'BUY' ? round(entry + risk, 2) : round(entry - risk, 2),
        tp2: side === 'BUY' ? round(entry + risk * 2, 2) : round(entry - risk * 2, 2),
        status,
        realizedR: settled ? REALIZED_R[status] : 0,
        slMovedToBE: status === 'TP1_HIT',
        ambiguousFill: r() < 0.08,
        trackable: true,
        createdAt: Date.now() - intBetween(r, 5, 2600) * 60000
    };
}

// Mot bo tin hieu co dinh cho ca phien xem: moi lan goi lai van the.
const ALL_SIGNALS = SYMBOLS
    .flatMap(symbol => Array.from({ length: 6 }, (_, i) => makeSignal(symbol, i)))
    .sort((a, b) => b.createdAt - a.createdAt);

const OPEN_GROUP = new Set(OPEN_STATUS);
const CLOSED_GROUP = new Set(['TP2', 'SL', 'BREAKEVEN']);

export function signals(params = {}) {
    let items = ALL_SIGNALS;

    if (params.symbol) {
        const symbol = String(params.symbol).toUpperCase();
        items = items.filter(s => s.symbol === symbol);
        // Symbol la, chua co san trong kho: sinh tai cho de trang khong trong tron
        if (items.length === 0) {
            items = Array.from({ length: 4 }, (_, i) => makeSignal(symbol, i))
                .sort((a, b) => b.createdAt - a.createdAt);
        }
    }

    if (params.group === 'open')   items = items.filter(s => OPEN_GROUP.has(s.status));
    if (params.group === 'closed') items = items.filter(s => CLOSED_GROUP.has(s.status));
    if (params.group === 'buy')    items = items.filter(s => s.side === 'BUY');
    if (params.group === 'sell')   items = items.filter(s => s.side === 'SELL');

    const limit = Number(params.limit) || 20;
    return { items: items.slice(0, limit), total: items.length };
}

export function signalById(id) {
    return ALL_SIGNALS.find(s => s.id === id) || null;
}

/* ------------------------------------------------------------ Thong ke ---- */
export function stats() {
    const decided = ALL_SIGNALS.filter(s => CLOSED_GROUP.has(s.status));
    const wins = decided.filter(s => s.realizedR > 0);
    const totalR = decided.reduce((n, s) => n + s.realizedR, 0);

    const byStrength = ['VERY_STRONG', 'STRONG', 'MEDIUM', 'NONE'].map(key => ({
        _id: key,
        count: ALL_SIGNALS.filter(s => s.strength === key).length
    }));

    return {
        total: ALL_SIGNALS.length,
        decided: decided.length,
        winRate: decided.length ? Math.round((wins.length / decided.length) * 100) : null,
        totalR: round(totalR, 2),
        avgR: decided.length ? round(totalR / decided.length, 2) : 0,
        avgScore: Math.round(ALL_SIGNALS.reduce((n, s) => n + s.score, 0) / ALL_SIGNALS.length),
        running:  ALL_SIGNALS.filter(s => s.status === 'RUNNING').length,
        watching: ALL_SIGNALS.filter(s => s.status === 'WATCHING').length,
        tp2:       ALL_SIGNALS.filter(s => s.status === 'TP2').length,
        breakeven: ALL_SIGNALS.filter(s => s.status === 'BREAKEVEN').length,
        sl:        ALL_SIGNALS.filter(s => s.status === 'SL').length,
        byStrength
    };
}

export function equity() {
    let cum = 0;
    const points = ALL_SIGNALS
        .filter(s => CLOSED_GROUP.has(s.status))
        .slice()
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(s => {
            cum += s.realizedR;
            return { at: s.createdAt, cumR: round(cum, 2), symbol: s.symbol };
        });
    return { points };
}

/* ---------------------------------------------------------------- Bot ----- */
export function botOverview(params = {}) {
    const limit = Number(params.limit) || 30;
    const items = SYMBOLS.slice(0, limit).map(symbol => {
        const { decision, trends } = decisionFor(symbol);
        const r = rng(symbol + ':overview');
        return {
            symbol,
            timeframe: '15m',
            createdAt: Date.now() - intBetween(r, 1, 90) * 60000,
            decision,
            trends
        };
    });
    return { items, total: items.length };
}

export function botState(symbol) {
    const upper = String(symbol).toUpperCase();
    const { decision, trends } = decisionFor(upper);
    const r = rng(upper + ':state');

    const open = signals({ symbol: upper, group: 'open', limit: 1 }).items;

    return {
        symbol: upper,
        snapshot: {
            symbol: upper,
            timeframe: '15m',
            createdAt: Date.now() - intBetween(r, 1, 45) * 60000,
            decision,
            trends
        },
        openSignals: open
    };
}

export function botConfig() {
    return {
        config: {
            weights: WEIGHTS,
            minScore: 60,
            timeframes: { entry: '15m', structure: '1h', bias: '4h' },
            risk: { rr1: 1, rr2: 2, moveToBEAtTP1: true }
        }
    };
}

const RULES_MARKDOWN = `# Bộ luật giao dịch SMC

Tài liệu này mô tả cách bot ra quyết định. Đây là **bản trưng bày giao diện** —
mọi số liệu trên trang đều là dữ liệu giả lập.

## 1. Xác định xu hướng đa khung

Bot đọc ba khung thời gian và chỉ vào lệnh khi khung nhỏ không đi ngược khung lớn.

- **H4** quyết định thiên hướng chung
- **H1** xác nhận cấu trúc
- **M15** tìm điểm vào

Ngược xu hướng H4 đang mạnh là luật chặn ưu tiên số 1.

## 2. Vùng cung và cầu

Vùng chỉ còn hiệu lực khi giá chưa quay lại quét sạch. Giá phải nằm **trong**
vùng thì tiêu chí này mới được tính điểm.

## 3. Premium / Discount

Chia range hiện tại làm ba phần: mua ở Discount, bán ở Premium, tránh vùng
cân bằng ở giữa.

## 4. Xác nhận BOS / CHoCH

Vào vùng thôi chưa đủ — phải có phá vỡ cấu trúc xác nhận thì mới kích hoạt lệnh.

## 5. Chấm điểm

| Tiêu chí | Điểm tối đa |
| --- | --- |
| Vùng cung / cầu | 40 |
| Premium / Discount | 20 |
| Thuận xu hướng H4 | 20 |
| BOS | 20 |
| CHoCH | 15 |

Dưới 60 điểm thì chỉ ghi nhận quan sát, không vào lệnh.

## 6. Quản trị rủi ro

- Stop loss đặt ngoài biên vùng
- TP1 tại 1R, TP2 tại 2R
- Chạm TP1 thì dời stop loss về hoà vốn
`;

export function botRules() {
    return {
        weights: WEIGHTS,
        pipeline: [
            'Nến đóng',
            'Dựng cấu trúc',
            'Xác định vùng',
            'Chấm điểm',
            'Lọc xu hướng',
            'Ra tín hiệu'
        ],
        content: RULES_MARKDOWN
    };
}

/* ------------------------------------------------------------ Backtest ---- */
export function backtest({ symbol = 'ZC1!', timeframe = '15m', from, to } = {}) {
    const upper = String(symbol).toUpperCase();
    const r = rng(`${upper}:${timeframe}:${from}:${to}`);
    const info = instrument(upper);

    const count = intBetween(r, 12, 48);
    const trades = [];
    let cum = 0;
    let peak = 0;
    let maxDd = 0;
    const equityPoints = [];

    const fromMs = from ? new Date(from).getTime() : Date.now() - 30 * 864e5;
    const toMs = to ? new Date(to).getTime() : Date.now();
    const step = Math.max(1, (toMs - fromMs) / count);

    for (let i = 0; i < count; i++) {
        const side = r() < 0.5 ? 'BUY' : 'SELL';
        const entry = round(info.base * between(r, 0.97, 1.03), 2);
        const risk = round(entry * between(r, 0.006, 0.016), 2);

        const roll = r();
        const status = roll < 0.38 ? 'TP2' : roll < 0.52 ? 'BREAKEVEN' : roll < 0.9 ? 'SL' : 'EXPIRED';
        const realizedR = REALIZED_R[status];

        const score = intBetween(r, 60, 100);
        const strength = score >= 90 ? 'VERY_STRONG' : score >= 75 ? 'STRONG' : 'MEDIUM';
        const openedAt = fromMs + step * i;

        cum = round(cum + realizedR, 2);
        peak = Math.max(peak, cum);
        maxDd = Math.max(maxDd, peak - cum);
        equityPoints.push({ at: openedAt, cumR: cum });

        trades.push({
            openedAt,
            side,
            strength,
            score,
            entry,
            sl:  side === 'BUY' ? round(entry - risk, 2) : round(entry + risk, 2),
            tp1: side === 'BUY' ? round(entry + risk, 2) : round(entry - risk, 2),
            tp2: side === 'BUY' ? round(entry + risk * 2, 2) : round(entry - risk * 2, 2),
            status,
            realizedR,
            ambiguousFill: r() < 0.06
        });
    }

    const decided = trades.filter(t => t.status !== 'EXPIRED');
    const wins = decided.filter(t => t.realizedR > 0);

    const byStrength = {};
    for (const key of ['VERY_STRONG', 'STRONG', 'MEDIUM']) {
        const group = trades.filter(t => t.strength === key);
        if (group.length) {
            byStrength[key] = {
                count: group.length,
                totalR: round(group.reduce((n, t) => n + t.realizedR, 0), 2)
            };
        }
    }

    return {
        symbol: upper,
        timeframe,
        from, to,
        bars: count * intBetween(r, 20, 60),
        evaluated: count * intBetween(r, 3, 9),
        stats: {
            decided: decided.length,
            winRate: decided.length ? Math.round((wins.length / decided.length) * 100) : null,
            totalR: cum,
            avgR: decided.length ? round(cum / decided.length, 2) : 0,
            maxDrawdownR: round(maxDd, 2)
        },
        equity: equityPoints,
        byStrength,
        trades,
        limitations: [
            'Đây là dữ liệu giả lập phục vụ trưng bày giao diện, không phải kết quả kiểm định thật.',
            'Không tính phí giao dịch, trượt giá hay chi phí qua đêm.',
            'Giả định lệnh luôn khớp đúng giá dự kiến.'
        ]
    };
}

/* -------------------------------------------------------------- Nguoi dung */
const USER_KEY = 'sf-mock-user';

const DEFAULT_USER = {
    email: 'demo@signalflow.vn',
    displayName: 'Người dùng thử',
    role: 'PRO',
    createdAt: Date.now() - 96 * 864e5,
    lastLoginAt: Date.now() - 3 * 3600e3,
    watchlist: ['ZC1!', 'ZW1!', 'ZS1!', 'ZM1!', 'ZL1!'],
    alertPrefs: { enabled: true, minStrength: 'STRONG' }
};

function readStore(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
        return fallback;                      // che do rieng tu
    }
}

function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* bo qua */ }
}

// "Dang nhap" chi la mot co trong localStorage. Khong co mat khau, khong co
// phien - de bam thu luong giao dien ma khong can may chu.
export const session = {
    isAuthed: () => readStore(USER_KEY, null) !== null,

    user() {
        return readStore(USER_KEY, null);
    },

    login(fields = {}) {
        const user = {
            ...DEFAULT_USER,
            ...(fields.email ? { email: fields.email } : {}),
            ...(fields.displayName ? { displayName: fields.displayName } : {}),
            lastLoginAt: Date.now()
        };
        writeStore(USER_KEY, user);
        return user;
    },

    update(patch) {
        const user = { ...(readStore(USER_KEY, null) || DEFAULT_USER), ...patch };
        writeStore(USER_KEY, user);
        return user;
    },

    logout() {
        try { localStorage.removeItem(USER_KEY); } catch (err) { /* bo qua */ }
    }
};

// Phien bi thu hoi chi song trong bo nho trang: bam "Dang xuat" thi dong do
// phai bien mat that, neu khong nguoi dung tuong nut hong.
const revokedSessions = new Set();

export function sessions() {
    const items = [
        { id: 's1', current: true,  ip: '113.161.72.14', userAgent: navigator.userAgent, createdAt: Date.now() - 2 * 3600e3 },
        { id: 's2', current: false, ip: '203.113.44.9',  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', createdAt: Date.now() - 3 * 864e5 },
        { id: 's3', current: false, ip: '14.161.7.201',  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', createdAt: Date.now() - 9 * 864e5 }
    ];
    return { items: items.filter(s => !revokedSessions.has(s.id)) };
}

export function revokeSession(id) {
    revokedSessions.add(String(id));
    return { ok: true };
}

export function events(limit = 12) {
    const types = ['LOGIN', 'LOGIN_FAIL', 'PASSWORD_CHANGE', 'LOGOUT', 'REGISTER'];
    const r = rng('events');
    const items = Array.from({ length: limit }, (_, i) => ({
        type: i === limit - 1 ? 'REGISTER' : pick(r, types),
        ip: `113.161.${intBetween(r, 1, 254)}.${intBetween(r, 1, 254)}`,
        createdAt: Date.now() - (i + 1) * intBetween(r, 2, 26) * 3600e3
    }));
    return { items };
}
