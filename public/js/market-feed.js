import { api } from './api.js';

// ============================================================================
//  Bang gia thi truong.
//
//  Ban mock: khong con nguon gia that. `/api/prices` di vao mock.js, noi gia
//  dao quanh mot moc co dinh theo song sin cham. Van giu vong poll thay vi lay
//  so mot lan roi thoi, de hieu ung nhay mau len/xuong va cac o cap nhat tung
//  phan van xem duoc dung nhu khi co du lieu that.
// ============================================================================

const DEFAULT_INTERVAL_MS = 30000;

export function createMarketFeed({ symbols = [], onUpdate, intervalMs = DEFAULT_INTERVAL_MS } = {}) {
    let list = symbols.map(s => s.toUpperCase());
    let timer = null;
    let closed = false;
    let inFlight = false;
    let first = true;

    const state = new Map();    // SYMBOL -> { symbol, price, changePct, prevPrice, name }

    async function poll() {
        if (closed || list.length === 0 || inFlight) return;
        inFlight = true;

        try {
            const res = await api.get(`/api/prices?symbols=${encodeURIComponent(list.join(','))}`, { retries: 0 });

            const changed = [];
            for (const row of res.items || []) {
                const prev = state.get(row.symbol);
                // prevPrice de trang goi biet nhay mau len/xuong
                const next = {
                    symbol: row.symbol,
                    price: row.price,
                    changePct: row.changePct,
                    name: row.name || '',
                    asOf: row.asOf || null,
                    prevPrice: prev ? prev.price : row.price
                };
                state.set(row.symbol, next);
                if (!prev || prev.price !== next.price) changed.push(next);
            }

            // Nghi phien thi gia khong doi, `changed` rong - nhung lan dau van phai
            // ve bang, neu khong trang se ket o khung xuong mai.
            if (onUpdate && (changed.length > 0 || first)) onUpdate(changed, state);
            first = false;
        } catch (err) {
            // Mat mang thi giu nguyen bang gia cu, phan con lai cua trang van chay
        } finally {
            inFlight = false;
        }
    }

    function start() {
        poll();
        timer = setInterval(poll, intervalMs);
    }
    start();

    return {
        get(symbol) { return state.get(String(symbol).toUpperCase()); },
        all() { return [...state.values()]; },
        refresh: poll,

        setSymbols(next) {
            const upper = next.map(s => s.toUpperCase());
            if (upper.join(',') === list.join(',')) return;
            list = upper;
            poll();
        },

        close() {
            closed = true;
            if (timer) clearInterval(timer);
            timer = null;
        }
    };
}
