import { checkPassword, STRENGTH_LABEL } from './validators.js';
import { icon } from './icons.js';

// ============================================================================
//  Thanh do do manh mat khau + danh sach dieu kien tick dan theo thoi gian go.
//  Nguoi dung thay ngay con thieu gi, khong phai bam submit roi moi biet.
// ============================================================================

export function attachPasswordMeter(input, container) {
    if (!input || !container) return () => ({ ok: false });

    const meter = container.querySelector('.pw-meter');
    const label = container.querySelector('.pw-label');
    const rulesEl = container.querySelector('.pw-rules');

    const update = () => {
        const result = checkPassword(input.value);

        if (meter) meter.dataset.score = String(input.value ? result.score : 0);
        if (label) label.textContent = input.value ? STRENGTH_LABEL[result.score] || '' : '';

        if (rulesEl) {
            for (const rule of result.rules) {
                const li = rulesEl.querySelector(`[data-rule="${rule.id}"]`);
                if (li) li.dataset.ok = String(rule.ok);
            }
        }
        return result;
    };

    input.addEventListener('input', update);
    update();
    return update;
}

export function attachPasswordToggle(input) {
    const wrap = input && input.closest('.input-wrap');
    const btn = wrap && wrap.querySelector('.toggle-pw');
    if (!btn) return;

    const paint = (showing) => {
        btn.innerHTML = icon(showing ? 'eyeOff' : 'eye', 17);
        btn.setAttribute('aria-label', showing ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        btn.dataset.showing = String(showing);
    };

    paint(false);

    btn.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        paint(!showing);
        input.focus();
    });
}
