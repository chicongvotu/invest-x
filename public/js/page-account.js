import { api, ApiError } from './api.js';
import { icon } from './icons.js';
import { fmtDateTime, timeAgo, esc } from './format.js';
import { attachPasswordMeter, attachPasswordToggle } from './password-meter.js';
import {
    checkPassword, setFieldError, clearErrors, showFormError, showFormOk,
    applyServerErrors, setLoading
} from './validators.js';

// ============================================================================
//  Trang tai khoan: 4 tab
// ============================================================================

const ROLE_LABEL = { USER: 'Miễn phí', PRO: 'PRO', ADMIN: 'Quản trị' };
const EVENT_LABEL = {
    REGISTER: 'Tạo tài khoản', LOGIN: 'Đăng nhập', LOGIN_FAIL: 'Đăng nhập thất bại',
    LOGOUT: 'Đăng xuất', PASSWORD_CHANGE: 'Đổi mật khẩu',
    ADMIN_RESET: 'Quản trị viên đặt lại mật khẩu', LOCKED: 'Tài khoản bị khoá'
};

let currentUser = null;

/* ------------------------------------------------------------- Tab ------ */
function initTabs() {
    const tabs = document.getElementById('accountTabs');
    const panels = [...document.querySelectorAll('.panel')];

    const show = (name) => {
        tabs.querySelectorAll('[data-panel]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.panel === name)));
        panels.forEach(p => { p.dataset.active = String(p.dataset.panel === name); });
        const url = new URL(location.href);
        url.searchParams.set('tab', name);
        history.replaceState(null, '', url);
    };

    tabs.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-panel]');
        if (btn) show(btn.dataset.panel);
    });

    const initial = new URLSearchParams(location.search).get('tab');
    if (initial && panels.some(p => p.dataset.panel === initial)) show(initial);
}

/* -------------------------------------------------------- Tong quan ----- */
async function loadUser() {
    const { user } = await api.get('/api/auth/me', { retries: 0 });
    currentUser = user;

    document.getElementById('accountEmail').textContent = user.email;
    document.getElementById('ovEmail').textContent = user.email;
    document.getElementById('ovName').textContent = user.displayName || '—';
    document.getElementById('ovRole').textContent = ROLE_LABEL[user.role] || user.role;
    document.getElementById('ovCreated').textContent = fmtDateTime(user.createdAt);
    document.getElementById('ovLastLogin').textContent = user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : '—';
    document.getElementById('pfName').value = user.displayName || '';

    document.querySelectorAll('[data-user-name]').forEach(el => {
        el.textContent = user.displayName || user.email.split('@')[0];
    });
    document.querySelectorAll('[data-user-initial]').forEach(el => {
        el.textContent = (user.displayName || user.email).charAt(0).toUpperCase();
    });

    renderWatchlist(user.watchlist || []);
    document.getElementById('alertEnabled').checked = Boolean(user.alertPrefs && user.alertPrefs.enabled);
    document.getElementById('alertStrength').value = (user.alertPrefs && user.alertPrefs.minStrength) || 'STRONG';
    return user;
}

function initProfileForm() {
    const form = document.getElementById('profileForm');
    const input = form.querySelector('[name="displayName"]');
    const submit = form.querySelector('[type="submit"]');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submit.disabled) return;
        clearErrors(form);
        setLoading(submit, true);
        try {
            const res = await api.put('/api/auth/profile', { displayName: input.value.trim() }, { retries: 0 });
            currentUser = res.user;
            document.getElementById('ovName').textContent = res.user.displayName || '—';
            document.querySelectorAll('[data-user-name]').forEach(el => {
                el.textContent = res.user.displayName || res.user.email.split('@')[0];
            });
            showFormOk(form, 'Đã lưu tên hiển thị');
        } catch (err) {
            applyServerErrors(form, err);
        } finally {
            setLoading(submit, false);
        }
    });
}

/* ----------------------------------------------------------- Bao mat --- */
function initPasswordForm() {
    const form = document.getElementById('passwordForm');
    const cur = form.querySelector('[name="currentPassword"]');
    const next = form.querySelector('[name="newPassword"]');
    const submit = form.querySelector('[type="submit"]');

    attachPasswordToggle(cur);
    attachPasswordToggle(next);
    attachPasswordMeter(next, form.querySelector('.pw-block'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submit.disabled) return;
        clearErrors(form);

        if (!cur.value) { setFieldError(cur, 'Nhập mật khẩu hiện tại'); cur.focus(); return; }

        const strength = checkPassword(next.value);
        if (!strength.ok) {
            const missing = strength.rules.find(r => !r.ok);
            setFieldError(next, `Mật khẩu chưa đạt: ${missing.label.toLowerCase()}`);
            next.focus();
            return;
        }
        if (cur.value === next.value) {
            setFieldError(next, 'Mật khẩu mới phải khác mật khẩu hiện tại');
            next.focus();
            return;
        }

        setLoading(submit, true);
        try {
            const res = await api.post('/api/auth/change-password',
                { currentPassword: cur.value, newPassword: next.value }, { retries: 0 });
            form.reset();
            attachPasswordMeter(next, form.querySelector('.pw-block'))();
            showFormOk(form, res.revokedSessions > 0
                ? `Đã đổi mật khẩu và đăng xuất ${res.revokedSessions} thiết bị khác`
                : 'Đã đổi mật khẩu');
            loadSessions();
            loadEvents();
        } catch (err) {
            applyServerErrors(form, err);
        } finally {
            setLoading(submit, false);
        }
    });
}

function deviceName(ua) {
    const s = String(ua || '');
    if (/iPhone|iPad/i.test(s)) return 'iOS';
    if (/Android/i.test(s)) return 'Android';
    if (/Macintosh/i.test(s)) return 'macOS';
    if (/Windows/i.test(s)) return 'Windows';
    if (/Linux/i.test(s)) return 'Linux';
    return 'Thiết bị khác';
}

async function loadSessions() {
    const box = document.getElementById('sessionList');
    try {
        const res = await api.get('/api/auth/sessions', { retries: 0 });
        if (!res.items.length) { box.innerHTML = '<div class="muted" style="font-size:13px">Không có phiên nào.</div>'; return; }

        box.innerHTML = res.items.map(s => `
            <div class="session-row">
                <span class="session-info">
                    <b>${esc(deviceName(s.userAgent))} ${s.current ? '<span class="badge badge-current">Thiết bị này</span>' : ''}</b>
                    <span>${esc(s.ip || 'IP không rõ')} · ${s.createdAt ? timeAgo(s.createdAt) : ''}</span>
                </span>
                ${s.current ? '' : `<button class="btn btn-ghost" data-revoke="${esc(String(s.id))}">Đăng xuất</button>`}
            </div>`).join('');

        box.querySelectorAll('[data-revoke]').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                try {
                    await api.delete('/api/auth/sessions/' + encodeURIComponent(btn.dataset.revoke));
                    loadSessions();
                } catch (err) {
                    btn.disabled = false;
                }
            });
        });
    } catch (err) {
        box.innerHTML = '<div class="muted" style="font-size:13px">Không tải được danh sách phiên.</div>';
    }
}

async function loadEvents() {
    const box = document.getElementById('eventList');
    try {
        const res = await api.get('/api/auth/events?limit=12', { retries: 0 });
        if (!res.items.length) { box.innerHTML = '<div class="muted" style="font-size:13px">Chưa có hoạt động.</div>'; return; }

        box.innerHTML = res.items.map(e => `
            <div class="event-row">
                <span>${esc(EVENT_LABEL[e.type] || e.type)}</span>
                <span class="muted">${esc(e.ip || '')} · ${timeAgo(e.createdAt)}</span>
            </div>`).join('');
    } catch (err) {
        box.innerHTML = '<div class="muted" style="font-size:13px">Không tải được hoạt động.</div>';
    }
}

/* ------------------------------------------------- Danh sach theo doi --- */
let watchlist = [];

function renderWatchlist(list) {
    watchlist = list;
    const box = document.getElementById('watchChips');
    if (!list.length) {
        box.innerHTML = '<div class="muted" style="font-size:13px">Chưa có symbol nào.</div>';
        return;
    }
    box.innerHTML = list.map(s => `
        <span class="watch-chip">${esc(s)}
            <button type="button" data-remove="${esc(s)}" aria-label="Xoá ${esc(s)}">${icon('close', 13)}</button>
        </span>`).join('');

    box.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => saveWatchlist(watchlist.filter(s => s !== btn.dataset.remove)));
    });
}

async function saveWatchlist(next) {
    const err = document.getElementById('watchError');
    const ok = document.getElementById('watchOk');
    err.dataset.show = 'false';
    try {
        const res = await api.put('/api/me/watchlist', { symbols: next }, { retries: 0 });
        renderWatchlist(res.symbols);
        ok.textContent = 'Đã lưu';
        ok.dataset.show = 'true';
        setTimeout(() => { ok.dataset.show = 'false'; }, 2500);
    } catch (e) {
        err.textContent = (e instanceof ApiError) ? e.message : 'Không lưu được';
        err.dataset.show = 'true';
    }
}

function initWatchlist() {
    document.getElementById('watchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('watchInput');
        const value = input.value.trim().toUpperCase();
        if (!value) return;
        if (watchlist.includes(value)) { input.value = ''; return; }
        saveWatchlist([...watchlist, value]);
        input.value = '';
    });
}

/* ---------------------------------------------------------- Canh bao --- */
function initAlerts() {
    const btn = document.getElementById('alertSave');
    btn.addEventListener('click', async () => {
        const err = document.getElementById('alertError');
        const ok = document.getElementById('alertOk');
        err.dataset.show = 'false';
        setLoading(btn, true);
        try {
            await api.put('/api/me/alerts', {
                enabled: document.getElementById('alertEnabled').checked,
                minStrength: document.getElementById('alertStrength').value
            }, { retries: 0 });
            ok.textContent = 'Đã lưu cấu hình cảnh báo';
            ok.dataset.show = 'true';
            setTimeout(() => { ok.dataset.show = 'false'; }, 2500);
        } catch (e) {
            err.textContent = (e instanceof ApiError) ? e.message : 'Không lưu được';
            err.dataset.show = 'true';
        } finally {
            setLoading(btn, false);
        }
    });
}

/* -------------------------------------------------------------- Boot --- */
initTabs();
initProfileForm();
initPasswordForm();
initWatchlist();
initAlerts();

loadUser()
    .then(() => { loadSessions(); loadEvents(); })
    .catch(() => { location.href = '/login?next=' + encodeURIComponent('/account'); });
