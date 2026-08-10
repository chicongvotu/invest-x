// ============================================================================
//  Bieu do SVG tu ve.
//
//  Vi sao khong dung Chart.js: chi can mot duong cong von va vai cot. Keo ca
//  thu vien tu CDN ve chi de lam bay nhieu do la khong dang - them mot diem
//  hong ngoai tam kiem soat, va mau sac phai dong bo tay voi bien CSS.
//  SVG thuan ke thua thang bien --up/--down/--brand nen tu doi theo theme sang/toi.
// ============================================================================

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    return node;
}

function emptyState(container, message) {
    container.innerHTML = `<div class="chart-empty">${message}</div>`;
}

// ---------------------------------------------------------------------------
//  Duong cong von tich luy theo R
// ---------------------------------------------------------------------------
export function lineChart(container, points, options = {}) {
    const {
        height = 220,
        padTop = 16, padBottom = 24, padLeft = 44, padRight = 12,
        valueKey = 'cumR',
        format = (v) => v.toFixed(2)
    } = options;

    if (!points || points.length === 0) {
        emptyState(container, options.emptyMessage || 'Chưa có dữ liệu');
        return;
    }

    const width = Math.max(320, container.clientWidth || 640);
    const values = points.map(p => Number(p[valueKey]) || 0);

    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    // Nới biên 8% để đường không dính sát mép
    min -= span * 0.08;
    max += span * 0.08;

    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;
    const x = (i) => padLeft + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v) => padTop + innerH - ((v - min) / (max - min)) * innerH;

    const svg = el('svg', {
        viewBox: `0 0 ${width} ${height}`, width: '100%', height,
        preserveAspectRatio: 'none', role: 'img',
        'aria-label': options.ariaLabel || 'Biểu đồ đường'
    });

    // Luoi ngang + nhan truc
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
        const v = min + ((max - min) * i) / ticks;
        const yy = y(v);
        svg.appendChild(el('line', {
            x1: padLeft, x2: width - padRight, y1: yy, y2: yy,
            stroke: 'var(--border)', 'stroke-width': 1
        }));
        const label = el('text', {
            x: padLeft - 8, y: yy + 4, 'text-anchor': 'end',
            fill: 'var(--text-secondary)', 'font-size': 10
        });
        label.textContent = format(v);
        svg.appendChild(label);
    }

    // Duong 0 dam hon: phan tren la lai, phan duoi la lo
    if (min < 0 && max > 0) {
        svg.appendChild(el('line', {
            x1: padLeft, x2: width - padRight, y1: y(0), y2: y(0),
            stroke: 'var(--border-strong)', 'stroke-width': 1, 'stroke-dasharray': '3 3'
        }));
    }

    const last = values[values.length - 1];
    const color = last >= 0 ? 'var(--up)' : 'var(--down)';
    const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

    const baseline = y(Math.max(min, Math.min(0, max)));
    svg.appendChild(el('path', {
        d: `${path} L${x(values.length - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`,
        fill: color, opacity: 0.12
    }));
    svg.appendChild(el('path', {
        d: path, fill: 'none', stroke: color,
        'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));

    // Cham cuoi cung
    svg.appendChild(el('circle', {
        cx: x(values.length - 1), cy: y(last), r: 3.5,
        fill: color, stroke: 'var(--bg-surface)', 'stroke-width': 2
    }));

    container.innerHTML = '';
    container.appendChild(svg);
}

// ---------------------------------------------------------------------------
//  Bieu do cot ngang - dung cho phan bo theo do manh / theo vung
// ---------------------------------------------------------------------------
export function barChart(container, items, options = {}) {
    const { rowHeight = 30, format = (v) => String(v) } = options;

    const rows = (items || []).filter(i => i && i.label != null);
    if (rows.length === 0) {
        emptyState(container, options.emptyMessage || 'Chưa có dữ liệu');
        return;
    }

    const max = Math.max(1, ...rows.map(r => Number(r.value) || 0));

    container.innerHTML = rows.map(r => {
        const value = Number(r.value) || 0;
        const pct = (value / max) * 100;
        return `<div class="bar-row" style="height:${rowHeight}px">
            <span class="bar-label">${r.label}</span>
            <span class="bar-track"><i style="width:${pct.toFixed(1)}%;background:${r.color || 'var(--brand)'}"></i></span>
            <span class="bar-value num">${format(value)}</span>
        </div>`;
    }).join('');
}

// ---------------------------------------------------------------------------
//  Vong tron diem so 0-100
// ---------------------------------------------------------------------------
export function scoreRing(score, size = 68) {
    const value = Math.max(0, Math.min(100, Number(score) || 0));
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    const dash = (value / 100) * c;

    const color = value >= 100 ? 'var(--brand)'
        : value >= 80 ? 'var(--up)'
        : value >= 60 ? 'var(--text-primary)'
        : 'var(--text-disabled)';

    return `<svg class="score-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Điểm ${value}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--bg-elevated)" stroke-width="5"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="5"
                stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}"
                transform="rotate(-90 ${size / 2} ${size / 2})"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em"
              fill="${color}" font-size="${size * 0.3}" font-weight="700"
              font-family="var(--font-mono)">${value}</text>
    </svg>`;
}

// Ve lai bieu do khi doi kich thuoc cua so (SVG dung toa do tuyet doi)
export function onResize(fn, delay = 200) {
    let timer = null;
    const handler = () => {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
}
