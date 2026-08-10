import { api, connectStream } from './api.js';
import { lineChart, barChart, scoreRing, onResize } from './charts.js';
import { renderMarkdown, renderToc } from './markdown.js';
import { icon } from './icons.js';
import { fmtNum, fmtR, timeAgo, esc } from './format.js';
import { bindConnState } from './layout.js';

// ============================================================================
//  Trang Bot: Truc tiep / Bang luat / Hieu suat / Backtest
// ============================================================================

const SIGNAL_LABEL = { BUY: 'MUA', SELL: 'BÁN', WAIT: 'CHỜ', WATCH_BUY: 'Chờ MUA', WATCH_SELL: 'Chờ BÁN' };
const STRENGTH_LABEL = { VERY_STRONG: 'Rất mạnh', STRONG: 'Mạnh', MEDIUM: 'Trung bình', NONE: 'Chưa đủ điều kiện' };
const TREND_LABEL = { BULLISH: 'Tăng', BEARISH: 'Giảm', NEUTRAL: 'Ngang' };
const ZONE_LABEL = { DEMAND: 'Vùng cầu', SUPPLY: 'Vùng cung', PREMIUM: 'Premium', DISCOUNT: 'Discount', EQUILIBRIUM: 'Cân bằng', NONE: '—' };
const VETO_LABEL = {
    NO_ZONE: 'Giá không nằm trong vùng cung hay cầu nào còn hiệu lực.',
    IN_EQUILIBRIUM: 'Giá đang ở vùng cân bằng — không bên nào có lợi thế.',
    WRONG_PD_ZONE: 'Vị trí giá ngược hướng của vùng và xu hướng H4 không đỡ.',
    COUNTER_TREND: 'Ngược xu hướng H4 đang mạnh — luật ưu tiên số 1 chặn lệnh này.',
    NO_CONFIRMATION: 'Đã vào vùng nhưng chưa có BOS hay CHoCH xác nhận.',
    LOW_SCORE: 'Chưa đủ 60 điểm để vào lệnh.',
    INVALID_RANGE: 'Dữ liệu range chưa hợp lệ.'
};

/* -------------------------------------------------------------- Tab ---- */
const loaded = new Set();

function showPanel(name) {
    document.querySelectorAll('[data-tab]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    document.querySelectorAll('.panel').forEach(p => { p.dataset.active = String(p.dataset.panel === name); });

    const url = new URL(location.href);
    url.searchParams.set('tab', name);
    history.replaceState(null, '', url);

    // Chi tai du lieu cua tab khi nguoi dung mo no lan dau
    if (loaded.has(name)) return;
    loaded.add(name);
    if (name === 'live') loadLive();
    if (name === 'rules') loadRules();
    if (name === 'performance') loadPerformance();
}

document.getElementById('botTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) showPanel(btn.dataset.tab);
});

/* ------------------------------------------------------- Tab Truc tiep - */
let weights = { zoneInside: 40, premiumDiscount: 20, trend: 20, bos: 20 };

function criteriaRow(breakdown, score) {
    // Snapshot tao truoc khi them scoreBreakdown khong co du lieu nay. Hien
    // "0/40" ben canh "score 100" thi mau thuan va lam nguoi doc mat tin tuong -
    // tha khong hien con hon hien sai.
    const sum = ['zone', 'premiumDiscount', 'trend', 'confirmation']
        .reduce((n, k) => n + (Number((breakdown || {})[k]) || 0), 0);
    if (sum === 0 && Number(score) > 0) {
        return `<div class="veto-line" style="margin-bottom:12px">${icon('clock', 14)}
            <span>Snapshot này tạo trước khi bot lưu chi tiết chấm điểm. Tín hiệu mới sẽ có đầy đủ.</span></div>`;
    }

    const rows = [
        { key: 'zone',            name: 'Vùng cung / cầu',    max: weights.zoneInside },
        { key: 'premiumDiscount', name: 'Premium / Discount', max: weights.premiumDiscount },
        { key: 'trend',           name: 'Thuận xu hướng H4',  max: weights.trend },
        { key: 'confirmation',    name: 'BOS / CHoCH',        max: weights.bos }
    ];
    return `<div class="crit-list" style="padding:0 0 12px">${rows.map(r => {
        const pts = Number(breakdown[r.key]) || 0;
        return `<div class="crit" data-ok="${pts > 0}">
            <span class="mark">${icon(pts > 0 ? 'target' : 'close', 13)}</span>
            <span class="name">${r.name}</span>
            <span class="pts">${pts}/${r.max}</span>
        </div>`;
    }).join('')}</div>`;
}

async function loadLive() {
    const box = document.getElementById('liveCards');
    try {
        const [res, cfg] = await Promise.all([api.botOverview({ limit: 30 }), api.get('/api/bot/config')]);
        weights = cfg.config.weights;

        if (!res.items.length) {
            box.innerHTML = `<div class="card"><div class="empty" style="padding:44px 24px">
                ${icon('inbox', 32)}Bot chưa nhận dữ liệu nào.
                <br><span style="font-size:12px">Bot tự quét theo chu kỳ; bảng sẽ có dữ liệu sau phiên giao dịch kế tiếp.</span>
            </div></div>`;
            return;
        }

        box.innerHTML = res.items.map(item => {
            const d = item.decision || {};
            const t = item.trends || {};
            return `<article class="card bot-card">
                <div class="bot-card-top">
                    ${scoreRing(d.score, 58)}
                    <span class="who">
                        <b>${esc(item.symbol)}</b>
                        <span>${esc(item.timeframe || '')} · ${timeAgo(item.createdAt)}</span>
                    </span>
                    <span class="sig sig-${esc(d.signal || 'WAIT')}">
                        <b>${SIGNAL_LABEL[d.signal] || '—'}</b>
                        <span>${STRENGTH_LABEL[d.strength] || '—'}</span>
                    </span>
                </div>

                <div class="bot-trends">
                    <span class="tf"><span>H4</span><b class="trend-pill trend-${esc(t.h4)}">${TREND_LABEL[t.h4] || '—'}</b></span>
                    <span class="tf"><span>H1</span><b class="trend-pill trend-${esc(t.h1)}">${TREND_LABEL[t.h1] || '—'}</b></span>
                    <span class="tf"><span>M15</span><b class="trend-pill trend-${esc(t.m15)}">${TREND_LABEL[t.m15] || '—'}</b></span>
                </div>

                <div class="smc-row" style="padding:8px 0;border-top:1px solid var(--border)">
                    <span class="k muted" style="font-size:12px">Vùng</span>
                    <span class="v" style="font-size:12px">${ZONE_LABEL[d.zone] || '—'} · ${ZONE_LABEL[d.pdZone] || '—'}</span>
                </div>

                ${criteriaRow(d.scoreBreakdown, d.score)}

                ${d.vetoReason ? `<div class="veto-line">${icon('alert', 14)}<span>${esc(VETO_LABEL[d.vetoReason] || d.vetoReason)}</span></div>` : ''}

                <a href="/chart?symbol=${encodeURIComponent(item.symbol)}" class="link-more" style="margin-top:12px">
                    Xem biểu đồ ${icon('chevronRight', 13)}
                </a>
            </article>`;
        }).join('');
    } catch (err) {
        box.innerHTML = `<div class="card"><div class="empty" style="padding:32px">Không tải được trạng thái bot.</div></div>`;
    }
}

/* -------------------------------------------------------- Tab Bang luat - */
async function loadRules() {
    const body = document.getElementById('rulesBody');
    const tocBox = document.getElementById('rulesToc');
    const strip = document.getElementById('weightsStrip');
    const pipe = document.getElementById('pipeline');

    try {
        const res = await api.botRules();

        const w = res.weights || {};
        strip.innerHTML = [
            ['Vùng cung / cầu', w.zoneInside],
            ['Premium / Discount', w.premiumDiscount],
            ['Xu hướng H4', w.trend],
            ['BOS', w.bos],
            ['CHoCH', w.choch]
        ].map(([label, value]) => `<div class="weight-chip"><span>${label}</span><b>${value ?? '—'}</b></div>`).join('');

        pipe.innerHTML = (res.pipeline || [])
            .map(s => `<span class="step">${esc(s)}</span>`)
            .join(`<span class="arrow">${icon('chevronRight', 14)}</span>`);

        const { html, headings } = renderMarkdown(res.content || '');
        body.innerHTML = html;
        tocBox.innerHTML = renderToc(headings);

        // Danh dau muc dang doc
        const targets = headings.map(h => document.getElementById(h.id)).filter(Boolean);
        const links = new Map([...tocBox.querySelectorAll('[data-toc]')].map(a => [a.dataset.toc, a]));
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                links.forEach(a => a.removeAttribute('data-active'));
                const link = links.get(entry.target.id);
                if (link) link.setAttribute('data-active', 'true');
            }
        }, { rootMargin: '-80px 0px -70% 0px' });
        targets.forEach(t => observer.observe(t));
    } catch (err) {
        body.innerHTML = '<div class="empty">Không tải được bảng luật.</div>';
    }
}

/* -------------------------------------------------------- Tab Hieu suat - */
let equityPoints = [];

async function loadPerformance() {
    try {
        const [stats, equity] = await Promise.all([api.stats(), api.equity()]);

        document.getElementById('kpiWin').textContent = stats.winRate == null ? '—' : `${stats.winRate}%`;
        document.getElementById('kpiR').textContent = fmtR(stats.totalR);
        document.getElementById('kpiAvgR').textContent = fmtR(stats.avgR);
        document.getElementById('kpiDecided').textContent = fmtNum(stats.decided);
        document.getElementById('kpiScore').textContent = fmtNum(stats.avgScore);

        const rEl = document.getElementById('kpiR');
        rEl.classList.toggle('up', (stats.totalR || 0) > 0);
        rEl.classList.toggle('down', (stats.totalR || 0) < 0);

        equityPoints = equity.points || [];
        lineChart(document.getElementById('equityChart'), equityPoints, {
            height: 250, ariaLabel: 'Đường cong vốn tích luỹ theo R',
            emptyMessage: 'Chưa có lệnh nào đóng để vẽ đường cong vốn.'
        });

        const byStrength = Object.fromEntries((stats.byStrength || []).map(s => [s._id, s.count]));
        barChart(document.getElementById('strengthChart'), [
            { label: 'Rất mạnh',   value: byStrength.VERY_STRONG || 0, color: 'var(--brand)' },
            { label: 'Mạnh',       value: byStrength.STRONG || 0,      color: 'var(--up)' },
            { label: 'Trung bình', value: byStrength.MEDIUM || 0,      color: 'var(--text-secondary)' },
            { label: 'Quan sát',   value: byStrength.NONE || 0,        color: 'var(--bg-elevated)' }
        ], { emptyMessage: 'Chưa có tín hiệu.' });

        barChart(document.getElementById('outcomeChart'), [
            { label: 'Đã TP2',   value: stats.tp2 || 0,       color: 'var(--up)' },
            { label: 'Hoà vốn',  value: stats.breakeven || 0, color: 'var(--text-secondary)' },
            { label: 'Dính SL',  value: stats.sl || 0,        color: 'var(--down)' }
        ], { emptyMessage: 'Chưa có lệnh nào đóng.' });
    } catch (err) {
        document.getElementById('equityChart').innerHTML = '<div class="chart-empty">Không tải được số liệu.</div>';
    }
}

// SVG dung toa do tuyet doi nen phai ve lai khi doi kich thuoc cua so
onResize(() => {
    if (!equityPoints.length) return;
    lineChart(document.getElementById('equityChart'), equityPoints, { height: 250 });
});

/* --------------------------------------------------------- Tab Backtest - */
const STATUS_RESULT = {
    TP2: { label: 'Đã TP2', cls: 'up' },
    BREAKEVEN: { label: 'Hoà vốn', cls: 'muted' },
    SL: { label: 'Dính SL', cls: 'down' },
    EXPIRED: { label: 'Hết hạn', cls: 'muted' }
};

function toDateInput(d) {
    return new Date(d).toISOString().slice(0, 10);
}

function initBacktest() {
    const form = document.getElementById('btForm');
    const errorBox = document.getElementById('btError');
    const result = document.getElementById('btResult');
    const runBtn = document.getElementById('btRun');

    const params = new URLSearchParams(location.search);
    document.getElementById('btTo').value = params.get('to') || toDateInput(Date.now());
    document.getElementById('btFrom').value = params.get('from') || toDateInput(Date.now() - 30 * 864e5);
    if (params.get('symbol')) document.getElementById('btSymbol').value = params.get('symbol').toUpperCase();
    if (params.get('tf')) document.getElementById('btTf').value = params.get('tf');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (runBtn.disabled) return;

        errorBox.dataset.show = 'false';
        runBtn.dataset.loading = 'true';
        runBtn.disabled = true;

        try {
            const report = await api.post('/api/backtest', {
                symbol: document.getElementById('btSymbol').value.trim().toUpperCase(),
                timeframe: document.getElementById('btTf').value,
                from: document.getElementById('btFrom').value,
                to: document.getElementById('btTo').value
            }, { retries: 0, timeout: 90000 });

            renderBacktest(report);
            result.hidden = false;
        } catch (err) {
            result.hidden = true;
            errorBox.textContent = err && err.message ? err.message : 'Không chạy được backtest';
            errorBox.dataset.show = 'true';
        } finally {
            runBtn.dataset.loading = 'false';
            runBtn.disabled = false;
        }
    });

    // Cho phep chia se ket qua bang duong dan:
    // /bot?tab=backtest&symbol=ZC1!&tf=15m&run=1
    if (params.get('run') === '1' && params.get('tab') === 'backtest') {
        form.requestSubmit();
    }
}

function renderBacktest(report) {
    const s = report.stats;

    document.getElementById('btWin').textContent = s.winRate == null ? '—' : `${s.winRate}%`;
    document.getElementById('btR').textContent = fmtR(s.totalR);
    document.getElementById('btAvgR').textContent = fmtR(s.avgR);
    document.getElementById('btDd').textContent = `${s.maxDrawdownR}R`;
    document.getElementById('btCount').textContent = fmtNum(s.decided);

    const rEl = document.getElementById('btR');
    rEl.classList.toggle('up', s.totalR > 0);
    rEl.classList.toggle('down', s.totalR < 0);
    document.getElementById('btDd').classList.add('down');

    document.getElementById('btRange').textContent =
        `${report.symbol} ${report.timeframe} · ${report.bars} nến · ${report.evaluated} lần chấm điểm`;

    lineChart(document.getElementById('btEquity'), report.equity, {
        height: 250,
        emptyMessage: 'Không có lệnh nào được chốt trong khoảng này.'
    });

    const order = ['VERY_STRONG', 'STRONG', 'MEDIUM'];
    barChart(document.getElementById('btStrength'),
        order.filter(k => report.byStrength[k]).map(k => ({
            label: STRENGTH_LABEL[k],
            value: report.byStrength[k].totalR,
            color: report.byStrength[k].totalR >= 0 ? 'var(--up)' : 'var(--down)'
        })),
        { format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}R`, emptyMessage: 'Chưa có lệnh nào chốt.' }
    );

    const rows = report.trades.slice().reverse();
    document.getElementById('btTradeNote').textContent =
        report.trades.length >= 200 ? 'Hiển thị 200 lệnh gần nhất' : `${rows.length} lệnh`;

    document.getElementById('btTrades').innerHTML = rows.length === 0
        ? `<tr><td colspan="9"><div class="empty">Bộ luật không vào lệnh nào trong khoảng thời gian này.</div></td></tr>`
        : rows.map(t => {
            const res = STATUS_RESULT[t.status] || { label: t.status, cls: 'muted' };
            return `<tr>
                <td class="muted">${new Date(t.openedAt).toLocaleString('vi-VN')}</td>
                <td>${t.side === 'BUY'
                    ? `<span class="badge badge-buy">${icon('arrowUp', 12)} MUA</span>`
                    : `<span class="badge badge-sell">${icon('arrowDown', 12)} BÁN</span>`}</td>
                <td><span class="strength strength-${esc(t.strength)}">${STRENGTH_LABEL[t.strength] || '—'}</span></td>
                <td class="num">${t.score}</td>
                <td class="ta-right num">${t.entry}</td>
                <td class="ta-right num down">${t.sl}</td>
                <td class="ta-right num up">${t.tp2}</td>
                <td><span class="status-pill status-${esc(t.status)}">${res.label}</span>${
                    t.ambiguousFill ? `<span class="warn-dot" title="SL và TP chạm trong cùng một nến">${icon('alert', 13)}</span>` : ''}</td>
                <td class="ta-right num ${t.realizedR > 0 ? 'up' : t.realizedR < 0 ? 'down' : ''}">${fmtR(t.realizedR)}</td>
            </tr>`;
        }).join('');

    document.getElementById('btLimits').innerHTML =
        (report.limitations || []).map(l => `<li>${esc(l)}</li>`).join('');
}

/* -------------------------------------------------------------- Boot --- */
initBacktest();

const initial = new URLSearchParams(location.search).get('tab');
showPanel(['live', 'rules', 'performance', 'backtest'].includes(initial) ? initial : 'live');

connectStream({
    onState: bindConnState,
    'snapshot': () => { if (loaded.has('live')) loadLive(); },
    'signal:new': () => {
        if (loaded.has('live')) loadLive();
        if (loaded.has('performance')) loadPerformance();
    },
    'signal:update': () => {
        if (loaded.has('performance')) loadPerformance();
    }
});
