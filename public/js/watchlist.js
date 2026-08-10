import { api } from './api.js';

// ============================================================================
//  Danh sach theo doi.
//
//  Chua dang nhap  -> luu localStorage (van dung duoc ngay, khong ep dang ky)
//  Da dang nhap    -> luu tren server, dong bo moi thiet bi
//
//  Lan dau dang nhap: GOP localStorage vao danh sach tren server roi xoa ban
//  cuc bo. Neu khong gop thi nguoi dung mat het symbol da chon truoc do -
//  cam giac nhu he thong "nuot" du lieu cua ho.
// ============================================================================

const KEY = 'sf-watchlist';
const DEFAULTS = ['ZC1!', 'ZW1!', 'ZS1!', 'ZM1!', 'ZL1!'];
const MAX = 50;

function clean(list) {
    const out = [];
    for (const raw of list || []) {
        const s = String(raw || '').trim().toUpperCase();
        if (s && /^[A-Z0-9!._-]{2,20}$/.test(s) && !out.includes(s)) out.push(s);
        if (out.length >= MAX) break;
    }
    return out;
}

function readLocal() {
    try {
        return clean(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch (err) {
        return [];
    }
}

function writeLocal(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (err) { /* che do rieng tu */ }
}

function clearLocal() {
    try { localStorage.removeItem(KEY); } catch (err) { /* bo qua */ }
}

export function createWatchlist() {
    let items = [];
    let authed = false;
    const listeners = new Set();

    const emit = () => listeners.forEach(fn => fn(items));

    async function load() {
        try {
            const res = await api.get('/api/me/watchlist', { retries: 0 });
            authed = true;

            const local = readLocal();
            const merged = clean([...(res.symbols || []), ...local]);

            if (local.length > 0 && merged.length !== (res.symbols || []).length) {
                const saved = await api.put('/api/me/watchlist', { symbols: merged }, { retries: 0 });
                items = saved.symbols;
            } else {
                items = res.symbols || [];
            }
            clearLocal();
        } catch (err) {
            authed = false;
            const local = readLocal();
            items = local.length ? local : DEFAULTS.slice();
        }
        emit();
        return items;
    }

    async function save(next) {
        const cleaned = clean(next);
        items = cleaned;
        emit();

        if (authed) {
            try {
                const res = await api.put('/api/me/watchlist', { symbols: cleaned }, { retries: 0 });
                items = res.symbols;
                emit();
            } catch (err) {
                // Luu that bai thi giu ban cuc bo lam du phong
                writeLocal(cleaned);
            }
        } else {
            writeLocal(cleaned);
        }
        return items;
    }

    return {
        load,
        all: () => items.slice(),
        isAuthed: () => authed,
        has: (symbol) => items.includes(String(symbol).toUpperCase()),
        add: (symbol) => save([...items, symbol]),
        remove: (symbol) => save(items.filter(s => s !== String(symbol).toUpperCase())),
        toggle: (symbol) => {
            const s = String(symbol).toUpperCase();
            return items.includes(s) ? save(items.filter(x => x !== s)) : save([...items, s]);
        },
        onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
    };
}
