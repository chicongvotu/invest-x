import { hydrateIcons } from './icons.js';
import { session } from './mock.js';

// ============================================================================
//  Hanh vi chung cua header: dropdown, drawer, theme, trang dang mo,
//  trang thai dang nhap.
//  Markup header nam thang trong tung file HTML (khong nhoi bang JS) de
//  Google doc duoc lien ket dieu huong va de trang khong bi nhay khi tai.
// ============================================================================

const THEME_KEY = 'sf-theme';

/* --- Sang / toi --------------------------------------------------------- */
function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (err) { /* che do rieng tu */ }

    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
        btn.setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
        const sun = btn.querySelector('[data-theme-icon="sun"]');
        const moon = btn.querySelector('[data-theme-icon="moon"]');
        if (sun)  sun.style.display  = theme === 'dark' ? 'none'  : 'block';
        if (moon) moon.style.display = theme === 'dark' ? 'block' : 'none';
    });
}

function initTheme() {
    applyTheme(currentTheme());
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
    });
}

/* --- Menu xo xuong ------------------------------------------------------ */
function initDropdowns() {
    const groups = [...document.querySelectorAll('.nav-group')];

    const closeAll = (except) => groups.forEach(g => {
        if (g !== except) {
            g.dataset.open = 'false';
            const t = g.querySelector('[aria-expanded]');
            if (t) t.setAttribute('aria-expanded', 'false');
        }
    });

    groups.forEach(group => {
        const trigger = group.querySelector('[aria-expanded]');
        if (!trigger) return;

        const toggle = (open) => {
            group.dataset.open = String(open);
            trigger.setAttribute('aria-expanded', String(open));
            if (open) closeAll(group);
        };

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            toggle(group.dataset.open !== 'true');
        });
        group.addEventListener('mouseenter', () => toggle(true));
        group.addEventListener('mouseleave', () => toggle(false));
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-group')) closeAll(null);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAll(null);
    });
}

/* --- Drawer tren mobile ------------------------------------------------- */
function initDrawer() {
    const drawer = document.querySelector('[data-drawer]');
    const backdrop = document.querySelector('[data-drawer-backdrop]');
    if (!drawer || !backdrop) return;

    const setOpen = (open) => {
        drawer.dataset.open = String(open);
        backdrop.dataset.open = String(open);
        document.body.style.overflow = open ? 'hidden' : '';
        drawer.setAttribute('aria-hidden', String(!open));
    };

    document.querySelectorAll('[data-drawer-open]').forEach(b => b.addEventListener('click', () => setOpen(true)));
    document.querySelectorAll('[data-drawer-close]').forEach(b => b.addEventListener('click', () => setOpen(false)));
    backdrop.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

    setOpen(false);
}

/* --- Danh dau trang dang mo --------------------------------------------- */
function initActiveNav() {
    const path = location.pathname.replace(/\/+$/, '') || '/';

    document.querySelectorAll('[data-nav-path]').forEach(link => {
        const target = link.dataset.navPath;
        const active = target === '/' ? path === '/' : path === target || path.startsWith(target + '/');
        if (active) {
            link.setAttribute('aria-current', 'page');
            const group = link.closest('.nav-group');
            if (group) {
                const trigger = group.querySelector('.nav-item');
                if (trigger) trigger.setAttribute('aria-current', 'page');
            }
        }
    });
}

/* --- Trang thai dang nhap ----------------------------------------------
   Ban mock: khong co phien tren may chu. Trang thai dang nhap doc thang tu
   localStorage nen chon duoc ngay tu khung hinh dau tien, header khong nhay
   tu "Dang nhap" sang avatar.
------------------------------------------------------------------------- */
function setAuthState(state, user) {
    document.body.dataset.authState = state;
    if (state !== 'user' || !user) return;

    const name = user.displayName || (user.email || '').split('@')[0] || 'Tài khoản';
    document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = name; });
    document.querySelectorAll('[data-user-initial]').forEach(el => { el.textContent = name.charAt(0).toUpperCase(); });
}

function initAuthState() {
    const user = session.user();
    setAuthState(user ? 'user' : 'guest', user);
}

/* --- Dang xuat ---------------------------------------------------------- */
function initLogout() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href="/logout"]');
        if (!link) return;
        e.preventDefault();
        session.logout();
        location.href = '/';
    });
}

/* --- Nam bat trang thai ket noi cua SSE --------------------------------- */
export function bindConnState(state) {
    document.querySelectorAll('[data-conn]').forEach(el => {
        el.dataset.state = state;
        const label = el.querySelector('span');
        if (label) label.textContent = state === 'live' ? 'Trực tiếp' : 'Mất kết nối';
    });
}

function init() {
    hydrateIcons();
    initTheme();
    initDropdowns();
    initDrawer();
    initActiveNav();
    initLogout();
    initAuthState();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
