// Mock data - moved to backend for Vercel compatibility
// (instead of client-side ESM which has module loading issues)

const INSTRUMENTS = {
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

function seedOf(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

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

const between = (r, min, max) => min + r() * (max - min);
const round = (n, digits = 2) => Number(n.toFixed(digits));

function instrument(symbol) {
    const known = INSTRUMENTS[symbol];
    if (known) return known;
    const r = rng(symbol);
    return { name: '', base: round(between(r, 20, 1200), 2), tick: 0.01 };
}

function priceOf(symbol) {
    const info = instrument(symbol);
    const r = rng(symbol + ':price');
    const phase = r() * Math.PI * 2;
    const amplitude = info.base * between(r, 0.004, 0.018);

    const t = Date.now() / 60000;
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

function prices(symbols) {
    return symbols.map(s => priceOf(String(s).toUpperCase()));
}

module.exports = { prices, INSTRUMENTS };
