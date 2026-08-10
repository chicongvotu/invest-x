// ============================================================================
//  Dinh dang so va thoi gian. Tap trung o day de moi trang hien giong nhau.
// ============================================================================

const LOCALE = 'vi-VN';

// So chu so thap phan hop ly theo do lon cua gia.
// BTC 64000 khong can 8 chu so, con DOGE 0.14 thi can.
function decimalsFor(value) {
    const abs = Math.abs(value);
    if (abs >= 1000) return 2;
    if (abs >= 1)    return 2;
    if (abs >= 0.01) return 4;
    if (abs >= 0.0001) return 6;
    return 8;
}

export function fmtPrice(value, decimals) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    const d = decimals != null ? decimals : decimalsFor(n);
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtNum(value, decimals = 0) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
    });
}

export function fmtPct(value, decimals = 2) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    return `${n > 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

// R la don vi rui ro: +1.5R nghia la lai gap 1.5 lan so tien da rui ro
export function fmtR(value) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    return `${n > 0 ? '+' : ''}${n.toFixed(2)}R`;
}

export function fmtDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(LOCALE);
}

export function timeAgo(value) {
    if (!value) return '—';
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '—';

    const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (sec < 60)    return `${sec} giây trước`;
    const min = Math.floor(sec / 60);
    if (min < 60)    return `${min} phút trước`;
    const hour = Math.floor(min / 60);
    if (hour < 24)   return `${hour} giờ trước`;
    const day = Math.floor(hour / 24);
    if (day < 30)    return `${day} ngày trước`;
    return new Date(then).toLocaleDateString(LOCALE);
}

export function trendClass(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return '';
    return n > 0 ? 'up' : 'down';
}

// Chay so tang dan cho con so lon o hero
export function countUp(el, target, duration = 1100) {
    const to = Number(target) || 0;
    if (to === 0) { el.textContent = '0'; return; }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { el.textContent = fmtNum(to); return; }

    const start = performance.now();
    const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        // easeOutExpo cho cam giac dung lai muot
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = fmtNum(Math.round(to * eased));
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

// Chan XSS khi nhoi chuoi tu API vao innerHTML
export function esc(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
