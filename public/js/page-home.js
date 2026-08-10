import { api, connectStream } from './api.js';
import { createMarketFeed } from './market-feed.js';
import { icon } from './icons.js';
import { fmtPrice, fmtPct, fmtR, fmtNum, timeAgo, countUp, esc } from './format.js';
import { bindConnState } from './layout.js';

// ============================================================================
//  Trang chu: so lieu hero, bang gia truc tiep, bang tin hieu moi nhat
// ============================================================================

// Bo hop dong ma bot dang quet. Ten hien thi lay tu /api/prices (server doc
// config/instruments.js) nen o day khong con bang ten trung lap nua.
const POPULAR = ['ZC1!', 'ZC2!', 'ZW1!', 'ZW2!', 'ZS1!', 'ZS2!', 'ZM1!', 'ZM2!', 'ZL1!', 'ZL2!'];

const STATUS_LABEL = {
    WATCHING: 'Quan sát', PENDING: 'Chờ khớp', RUNNING: 'Đang chạy',
    TP1_HIT: 'Đã TP1', TP2: 'Đã TP2', SL: 'Dính SL', BREAKEVEN: 'Hoà vốn',
    CANCELLED: 'Đã huỷ', EXPIRED: 'Hết hạn'
};

const STRENGTH_LABEL = {
    VERY_STRONG: 'Rất mạnh', STRONG: 'Mạnh', MEDIUM: 'Trung bình', NONE: '—'
};

const ZONE_LABEL = {
    DEMAND: 'Cầu', SUPPLY: 'Cung', PREMIUM: 'Premium',
    DISCOUNT: 'Discount', EQUILIBRIUM: 'Cân bằng', NONE: '—'
};

/* --------------------------------------------------------------- Hero --- */
async function loadStats() {
    try {
        const s = await api.stats();
        countUp(document.getElementById('heroCount'), s.total || 0);
        document.getElementById('statWin').textContent = s.winRate == null ? '—' : `${s.winRate}%`;
        document.getElementById('statR').textContent = fmtR(s.totalR);
        document.getElementById('statRunning').textContent = fmtNum(s.running);
        document.getElementById('statWatching').textContent = fmtNum(s.watching);

        const rEl = document.getElementById('statR');
        rEl.classList.toggle('up', (s.totalR || 0) > 0);
        rEl.classList.toggle('down', (s.totalR || 0) < 0);
    } catch (err) {
        document.getElementById('heroCount').textContent = '—';
    }
}

/* ------------------------------------------------------- Bang gia ------- */
const marketListEl = document.getElementById('marketList');
let marketTab = 'popular';
let botSymbols = [];
let ticker = null;

function marketRows() {
    if (!ticker) return [];
    const all = ticker.all();

    if (marketTab === 'gainers') return [...all].sort((a, b) => b.changePct - a.changePct);
    if (marketTab === 'losers')  return [...all].sort((a, b) => a.changePct - b.changePct);
    if (marketTab === 'bot')     return all.filter(r => botSymbols.includes(r.symbol));
    return POPULAR.map(s => ticker.get(s)).filter(Boolean);
}

function renderMarket() {
    const rows = marketRows();

    if (rows.length === 0) {
        marketListEl.innerHTML = marketTab === 'bot'
            ? `<div class="empty" style="padding:28px 20px">Bot chưa theo dõi symbol nào.</div>`
            : `<div class="empty" style="padding:28px 20px">Chưa lấy được bảng giá.</div>`;
        return;
    }

    // Ngu coc nghi dem, cuoi tuan va ngay le. Khong ghi ro moc thoi gian thi bang
    // gia dung im trong nhieu gio se bi hieu nham la he thong hong.
    const asOf = rows.map(r => r.asOf).filter(Boolean).sort().pop();
    const stale = asOf && Date.now() - asOf > 45 * 60000;

    marketListEl.innerHTML = (stale
        ? `<div class="market-asof">Thị trường đang nghỉ · giá lúc ${timeAgo(asOf)}</div>`
        : '') + rows.map(r => {
        const dir = r.changePct >= 0 ? 'up' : 'down';
        return `<a class="market-row" href="/chart?symbol=${encodeURIComponent(r.symbol)}" data-row="${esc(r.symbol)}">
            <span class="market-sym"><b>${esc(r.symbol)}</b><span>${esc(r.name || '')}</span></span>
            <span class="market-price">${fmtPrice(r.price)}</span>
            <span class="market-chg ${dir}">${fmtPct(r.changePct)}</span>
        </a>`;
    }).join('');
}

// Chi cap nhat o gia cua nhung dong vua doi, khong ve lai ca danh sach
function patchMarket(changed) {
    if (marketTab === 'gainers' || marketTab === 'losers') { renderMarket(); return; }

    for (const r of changed) {
        const row = marketListEl.querySelector(`[data-row="${CSS.escape(r.symbol)}"]`);
        if (!row) continue;

        const priceEl = row.querySelector('.market-price');
        const chgEl = row.querySelector('.market-chg');
        priceEl.textContent = fmtPrice(r.price);
        chgEl.textContent = fmtPct(r.changePct);
        chgEl.className = `market-chg ${r.changePct >= 0 ? 'up' : 'down'}`;

        if (r.price !== r.prevPrice) {
            const cls = r.price > r.prevPrice ? 'flash-up' : 'flash-down';
            row.classList.remove('flash-up', 'flash-down');
            void row.offsetWidth;             // ep trinh duyet chay lai animation
            row.classList.add(cls);
        }
    }
}

function initMarket() {
    document.getElementById('marketTabs').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-market-tab]');
        if (!btn) return;
        document.querySelectorAll('[data-market-tab]').forEach(t => t.setAttribute('aria-selected', String(t === btn)));
        marketTab = btn.dataset.marketTab;
        renderMarket();
    });

    ticker = createMarketFeed({
        symbols: POPULAR,
        onUpdate: (changed) => {
            if (!marketListEl.querySelector('[data-row]')) renderMarket();
            else patchMarket(changed);
        }
    });

    // Them symbol ma bot dang theo doi vao luong gia
    api.botOverview({ limit: 20 }).then(res => {
        botSymbols = (res.items || []).map(i => i.symbol);
        const extra = botSymbols.filter(s => !POPULAR.includes(s));
        if (extra.length) ticker.setSymbols([...POPULAR, ...extra]);
    }).catch(() => {});
}

/* --------------------------------------------------- Bang tin hieu ------ */
const rowsEl = document.getElementById('signalRows');
let signalTab = '';

function sideBadge(s) {
    if (s.isWatch) {
        return `<span class="badge badge-watch">${s.side === 'BUY' ? 'Chờ MUA' : 'Chờ BÁN'}</span>`;
    }
    return s.side === 'BUY'
        ? `<span class="badge badge-buy">${icon('arrowUp', 12)} MUA</span>`
        : `<span class="badge badge-sell">${icon('arrowDown', 12)} BÁN</span>`;
}

function renderSignals(items) {
    if (!items.length) {
        rowsEl.innerHTML = `<tr><td colspan="11"><div class="empty">
            ${icon('inbox', 32)}
            Chưa có tín hiệu nào.<br>Bot tự quét mỗi khi có nến mới đóng — chờ phiên giao dịch kế tiếp.
        </div></td></tr>`;
        return;
    }

    rowsEl.innerHTML = items.map(s => {
        const warn = s.ambiguousFill
            ? `<span class="warn-dot" title="SL và TP chạm trong cùng một nến 1 phút — kết quả là suy đoán">${icon('alert', 13)}</span>`
            : '';
        return `<tr>
            <td><span class="sym-cell"><b>${esc(s.symbol)}</b><span>${esc(s.timeframe || '')}${s.trackable === false ? ' · ngoài Binance' : ''}</span></span></td>
            <td>${sideBadge(s)}</td>
            <td><span class="strength strength-${esc(s.strength)}">${STRENGTH_LABEL[s.strength] || '—'}</span></td>
            <td><span class="score-cell"><span class="score-bar"><i style="width:${Math.min(100, s.score || 0)}%"></i></span><span class="num">${s.score || 0}</span></span></td>
            <td class="muted">${ZONE_LABEL[s.zone] || '—'}</td>
            <td class="ta-right num">${fmtPrice(s.entry)}</td>
            <td class="ta-right num down">${fmtPrice(s.sl)}</td>
            <td class="ta-right num up">${fmtPrice(s.tp1)}</td>
            <td class="ta-right num up">${fmtPrice(s.tp2)}</td>
            <td><span class="status-pill status-${esc(s.status)}">${STATUS_LABEL[s.status] || esc(s.status)}</span>${warn}</td>
            <td class="ta-right muted">${timeAgo(s.createdAt)}</td>
        </tr>`;
    }).join('');
}

async function loadSignals() {
    try {
        const params = { limit: 12 };
        if (signalTab) params.group = signalTab;
        const res = await api.signals(params);
        renderSignals(res.items || []);
    } catch (err) {
        rowsEl.innerHTML = `<tr><td colspan="11"><div class="empty">Không tải được tín hiệu.</div></td></tr>`;
    }
}

function initSignals() {
    document.getElementById('signalTabs').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-signal-tab]');
        if (!btn) return;
        document.querySelectorAll('[data-signal-tab]').forEach(t => t.setAttribute('aria-selected', String(t === btn)));
        signalTab = btn.dataset.signalTab;
        loadSignals();
    });
    loadSignals();
}

/* ------------------------------------------------------------ Khac ------ */
function initSymbolForm() {
    document.getElementById('symbolForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const value = document.getElementById('symbolInput').value.trim().toUpperCase();
        if (value) location.href = `/chart?symbol=${encodeURIComponent(value)}`;
    });
}

function initStream() {
    connectStream({
        onState: bindConnState,
        'signal:new':    () => { loadSignals(); loadStats(); },
        'signal:update': () => { loadSignals(); loadStats(); }
    });
}

loadStats();
initMarket();
initSignals();
initSymbolForm();
initStream();

// Thoi gian tuong doi ("5 phut truoc") phai tu gia di theo thoi gian
setInterval(loadSignals, 60000);
