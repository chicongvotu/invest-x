import { api, connectStream } from './api.js';
import { createMarketFeed } from './market-feed.js';
import { createWatchlist } from './watchlist.js';
import { scoreRing } from './charts.js';
import { icon } from './icons.js';
import { fmtPrice, fmtPct, timeAgo, esc } from './format.js';
import { bindConnState } from './layout.js';

// ============================================================================
//  Trang Bieu do: danh sach theo doi + TradingView + panel SMC + bang tin hieu
// ============================================================================

const STATUS_LABEL = {
    WATCHING: 'Quan sát', PENDING: 'Chờ khớp', RUNNING: 'Đang chạy', TP1_HIT: 'Đã TP1',
    TP2: 'Đã TP2', SL: 'Dính SL', BREAKEVEN: 'Hoà vốn', CANCELLED: 'Đã huỷ', EXPIRED: 'Hết hạn'
};
const STRENGTH_LABEL = { VERY_STRONG: 'Rất mạnh', STRONG: 'Mạnh', MEDIUM: 'Trung bình', NONE: '—' };
const ZONE_LABEL = { DEMAND: 'Vùng cầu', SUPPLY: 'Vùng cung', PREMIUM: 'Premium', DISCOUNT: 'Discount', EQUILIBRIUM: 'Cân bằng', NONE: '—' };
const SIGNAL_LABEL = { BUY: 'MUA', SELL: 'BÁN', WAIT: 'CHỜ', WATCH_BUY: 'Chờ MUA', WATCH_SELL: 'Chờ BÁN' };
const VETO_LABEL = {
    NO_ZONE: 'Giá không nằm trong vùng cung hay cầu nào còn hiệu lực.',
    IN_EQUILIBRIUM: 'Giá đang ở vùng cân bằng — không bên nào có lợi thế.',
    WRONG_PD_ZONE: 'Vị trí giá ngược với hướng của vùng, và xu hướng H4 không đỡ.',
    COUNTER_TREND: 'Ngược xu hướng H4 đang mạnh — luật ưu tiên số 1 chặn lệnh này.',
    NO_CONFIRMATION: 'Đã vào vùng nhưng chưa có BOS hay CHoCH xác nhận.',
    LOW_SCORE: 'Chưa đủ 60 điểm để vào lệnh.',
    INVALID_RANGE: 'Dữ liệu range chưa hợp lệ.'
};

const watchlist = createWatchlist();
let currentSymbol = (new URLSearchParams(location.search).get('symbol') || 'ZC1!').toUpperCase();
let ticker = null;
let tvLoaded = false;

/* ------------------------------------------------- Danh sach theo doi --- */
const wlListEl = document.getElementById('wlList');

function renderWatchlist(items) {
    if (!items.length) {
        wlListEl.innerHTML = '<div class="empty" style="padding:20px 14px;font-size:12px">Chưa có symbol nào.</div>';
        return;
    }

    wlListEl.innerHTML = items.map(s => {
        const row = ticker && ticker.get(s);
        const chg = row ? fmtPct(row.changePct) : '—';
        const cls = row ? (row.changePct >= 0 ? 'up' : 'down') : 'muted';
        return `<button class="wl-item" data-symbol="${esc(s)}" aria-current="${s === currentSymbol}">
            <span class="sym">${esc(s)}</span>
            <span class="chg ${cls}" data-chg="${esc(s)}">${chg}</span>
            <span class="del" data-del="${esc(s)}" role="button" aria-label="Xoá ${esc(s)}">${icon('close', 13)}</span>
        </button>`;
    }).join('');

    document.getElementById('wlSync').textContent = watchlist.isAuthed()
        ? 'Đồng bộ trên mọi thiết bị'
        : 'Lưu trên trình duyệt này. Đăng nhập để đồng bộ.';

    if (ticker) ticker.setSymbols(items);
}

wlListEl.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); watchlist.remove(del.dataset.del); return; }
    const item = e.target.closest('[data-symbol]');
    if (item) selectSymbol(item.dataset.symbol);
});

document.getElementById('wlForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('wlInput');
    const value = input.value.trim().toUpperCase();
    if (!value) return;
    watchlist.add(value).then(() => selectSymbol(value));
    input.value = '';
});

watchlist.onChange(renderWatchlist);

/* --------------------------------------------------------- Gia truc tiep - */
function initTicker(symbols) {
    ticker = createMarketFeed({
        symbols,
        onUpdate: (changed) => {
            for (const r of changed) {
                const cell = wlListEl.querySelector(`[data-chg="${CSS.escape(r.symbol)}"]`);
                if (cell) {
                    cell.textContent = fmtPct(r.changePct);
                    cell.className = `chg ${r.changePct >= 0 ? 'up' : 'down'}`;
                }
                if (r.symbol === currentSymbol) paintHeaderPrice(r);
            }
        }
    });
}

function paintHeaderPrice(row) {
    const priceEl = document.getElementById('tvPrice');
    const chgEl = document.getElementById('tvChg');
    priceEl.textContent = fmtPrice(row.price);
    chgEl.textContent = fmtPct(row.changePct);
    chgEl.className = `tv-chg ${row.changePct >= 0 ? 'up' : 'down'}`;
}

/* ----------------------------------------------------- TradingView ------ */
// Widget khong ho tro doi symbol tai cho, phai dung moi. Xoa sach container
// truoc khi tao lai, neu khong iframe cu con nam do va ro bo nho.
function mountTradingView(symbol) {
    const box = document.getElementById('tvContainer');
    if (typeof TradingView === 'undefined') {
        box.innerHTML = `<div class="tv-fallback">Không tải được biểu đồ TradingView.<br>Kiểm tra kết nối mạng rồi tải lại trang.</div>`;
        return;
    }
    box.innerHTML = '<div id="tvInner"></div>';
    tvLoaded = true;

    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    new TradingView.widget({
        autosize: true,
        symbol: tvSymbol(symbol),
        interval: '15',
        timezone: 'Asia/Ho_Chi_Minh',
        theme: dark ? 'dark' : 'light',
        style: '1',
        locale: 'vi_VN',
        enable_publishing: false,
        backgroundColor: dark ? '#0B0E11' : '#FFFFFF',
        gridColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        container_id: 'tvInner'
    });
}

// TradingView can tien to san. Cap USDT gan nhu chac chan la Binance;
// symbol khac (ZW1!, XAUUSD) de nguyen cho TradingView tu phan giai.
function tvSymbol(symbol) {
    if (/USDT$/.test(symbol)) return `BINANCE:${symbol}`;
    // Ngu coc CBOT: gan tien to san de TradingView khong doan nham sang san khac
    if (/^(ZC|ZW|ZS|ZM|ZL)\d!$/.test(symbol)) return `CBOT:${symbol}`;
    return symbol;
}

/* ---------------------------------------------------------- Panel SMC --- */
function trendPill(value) {
    const label = value === 'BULLISH' ? 'Tăng' : value === 'BEARISH' ? 'Giảm' : 'Đi ngang';
    return `<span class="trend-pill trend-${esc(value)}">${label}</span>`;
}

function criteria(breakdown, weights, score) {
    // Xem chu thich trong page-bot.js: khong hien "0/40" canh "score 100"
    const sum = ['zone', 'premiumDiscount', 'trend', 'confirmation']
        .reduce((n, k) => n + (Number((breakdown || {})[k]) || 0), 0);
    if (sum === 0 && Number(score) > 0) {
        return `<div class="veto-box" style="margin:0 0 4px">Snapshot này tạo trước khi bot lưu chi tiết chấm điểm.</div>`;
    }

    const rows = [
        { key: 'zone',            name: 'Vùng cung / cầu',   max: weights.zoneInside },
        { key: 'premiumDiscount', name: 'Premium / Discount', max: weights.premiumDiscount },
        { key: 'trend',           name: 'Thuận xu hướng H4',  max: weights.trend },
        { key: 'confirmation',    name: 'BOS / CHoCH',        max: weights.bos }
    ];
    return rows.map(r => {
        const points = Number(breakdown[r.key]) || 0;
        return `<div class="crit" data-ok="${points > 0}">
            <span class="mark">${icon(points > 0 ? 'target' : 'close', 13)}</span>
            <span class="name">${r.name}</span>
            <span class="pts">${points}/${r.max}</span>
        </div>`;
    }).join('');
}

async function loadSmcPanel(symbol) {
    const box = document.getElementById('smcPanel');
    try {
        const [state, cfg] = await Promise.all([api.botState(symbol), api.get('/api/bot/config')]);
        const weights = cfg.config.weights;
        const snap = state.snapshot;

        if (!snap) {
            box.innerHTML = `<div class="card"><div class="card-head"><h3>Trạng thái bot</h3></div>
                <div class="empty" style="padding:32px 20px">
                    ${icon('inbox', 28)}Bot chưa nhận dữ liệu cho ${esc(symbol)}.
                    <br><span style="font-size:12px">Gắn indicator lên chart này và tạo alert.</span>
                </div></div>`;
            return;
        }

        const d = snap.decision || {};
        const trends = snap.trends || {};
        const open = (state.openSignals || [])[0];

        box.innerHTML = `
        <div class="card">
            <div class="smc-score">
                ${scoreRing(d.score)}
                <span class="meta">
                    <b>${SIGNAL_LABEL[d.signal] || d.signal || '—'}</b>
                    <span>${STRENGTH_LABEL[d.strength] || '—'} · ${timeAgo(snap.createdAt)}</span>
                </span>
            </div>

            <div class="smc-rows">
                <div class="smc-row"><span class="k">Xu hướng H4</span><span class="v">${trendPill(trends.h4)}</span></div>
                <div class="smc-row"><span class="k">Xu hướng H1</span><span class="v">${trendPill(trends.h1)}</span></div>
                <div class="smc-row"><span class="k">Xu hướng M15</span><span class="v">${trendPill(trends.m15)}</span></div>
                <div class="smc-row"><span class="k">Ba khung cùng chiều</span><span class="v">${
                    d.mtfAligned
                        ? '<span class="trend-pill trend-BULLISH">Có</span>'
                        : '<span class="trend-pill trend-NEUTRAL">Không</span>'
                }</span></div>
                <div class="smc-row"><span class="k">Vùng kích hoạt</span><span class="v">${ZONE_LABEL[d.zone] || '—'}</span></div>
                <div class="smc-row"><span class="k">Vị trí giá</span><span class="v">${ZONE_LABEL[d.pdZone] || '—'}</span></div>
            </div>

            <div class="crit-list">${criteria(d.scoreBreakdown, weights, d.score)}</div>

            ${d.vetoReason ? `<div class="veto-box"><b>Vì sao chưa vào lệnh</b>${esc(VETO_LABEL[d.vetoReason] || d.vetoReason)}</div>` : ''}
        </div>

        ${open ? `<div class="card">
            <div class="card-head"><h3>Lệnh đang mở</h3>
                <span class="status-pill status-${esc(open.status)}">${STATUS_LABEL[open.status] || open.status}</span></div>
            <div class="plan-rows">
                <div class="plan-row"><span class="k">Entry</span><span class="v">${fmtPrice(open.entry)}</span></div>
                <div class="plan-row"><span class="k">Stop Loss</span><span class="v down">${fmtPrice(open.sl)}${open.slMovedToBE ? ' (hoà vốn)' : ''}</span></div>
                <div class="plan-row"><span class="k">TP1 · 1R</span><span class="v up">${fmtPrice(open.tp1)}</span></div>
                <div class="plan-row"><span class="k">TP2 · 2R</span><span class="v up">${fmtPrice(open.tp2)}</span></div>
                <div class="plan-row"><span class="k">R đã thực nhận</span><span class="v">${(open.realizedR || 0).toFixed(2)}R</span></div>
            </div>
        </div>` : ''}`;
    } catch (err) {
        box.innerHTML = `<div class="card"><div class="empty" style="padding:28px 20px">Không tải được trạng thái bot.</div></div>`;
    }
}

/* ------------------------------------------------ Bang tin hieu symbol -- */
async function loadSignals(symbol) {
    const body = document.getElementById('sigRows');
    try {
        const res = await api.signals({ symbol, limit: 15 });
        if (!res.items.length) {
            body.innerHTML = `<tr><td colspan="9"><div class="empty">Chưa có tín hiệu nào cho ${esc(symbol)}.</div></td></tr>`;
            return;
        }
        body.innerHTML = res.items.map(s => `<tr>
            <td>${s.side === 'BUY'
                ? `<span class="badge badge-buy">${icon('arrowUp', 12)} MUA</span>`
                : `<span class="badge badge-sell">${icon('arrowDown', 12)} BÁN</span>`}</td>
            <td><span class="strength strength-${esc(s.strength)}">${STRENGTH_LABEL[s.strength] || '—'}</span></td>
            <td><span class="score-cell"><span class="score-bar"><i style="width:${Math.min(100, s.score || 0)}%"></i></span><span class="num">${s.score || 0}</span></span></td>
            <td class="muted">${ZONE_LABEL[s.zone] || '—'}</td>
            <td class="ta-right num">${fmtPrice(s.entry)}</td>
            <td class="ta-right num down">${fmtPrice(s.sl)}</td>
            <td class="ta-right num up">${fmtPrice(s.tp2)}</td>
            <td><span class="status-pill status-${esc(s.status)}">${STATUS_LABEL[s.status] || esc(s.status)}</span></td>
            <td class="ta-right muted">${timeAgo(s.createdAt)}</td>
        </tr>`).join('');
    } catch (err) {
        body.innerHTML = `<tr><td colspan="9"><div class="empty">Không tải được tín hiệu.</div></td></tr>`;
    }
}

/* ------------------------------------------------------- Doi symbol ---- */
function selectSymbol(symbol) {
    const next = String(symbol).toUpperCase();
    if (next === currentSymbol && tvLoaded) return;
    currentSymbol = next;

    document.getElementById('tvName').textContent = next;
    document.title = `${next} — Biểu đồ trực tiếp kèm vùng SMC · SignalFlow`;

    const url = new URL(location.href);
    url.searchParams.set('symbol', next);
    history.replaceState(null, '', url);

    wlListEl.querySelectorAll('[data-symbol]').forEach(b => {
        b.setAttribute('aria-current', String(b.dataset.symbol === next));
    });

    const row = ticker && ticker.get(next);
    if (row) paintHeaderPrice(row);
    else {
        document.getElementById('tvPrice').textContent = '—';
        document.getElementById('tvChg').textContent = '';
    }

    mountTradingView(next);
    loadSmcPanel(next);
    loadSignals(next);
}

document.getElementById('wlStar').addEventListener('click', () => {
    watchlist.toggle(currentSymbol);
});

/* -------------------------------------------------------------- Boot --- */
(async () => {
    const items = await watchlist.load();
    const symbols = items.includes(currentSymbol) ? items : [...items, currentSymbol];
    initTicker(symbols);
    renderWatchlist(items);
    selectSymbol(currentSymbol);
})();

connectStream({
    onState: bindConnState,
    'signal:new': (p) => { if (!p || p.symbol === currentSymbol) { loadSmcPanel(currentSymbol); loadSignals(currentSymbol); } },
    'signal:update': (p) => { if (!p || p.symbol === currentSymbol) { loadSmcPanel(currentSymbol); loadSignals(currentSymbol); } },
    'snapshot': (p) => { if (p && p.symbol === currentSymbol) loadSmcPanel(currentSymbol); }
});

// Doi sang/toi thi phai dung lai widget vi TradingView nhan theme luc khoi tao
const themeObserver = new MutationObserver(() => mountTradingView(currentSymbol));
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
