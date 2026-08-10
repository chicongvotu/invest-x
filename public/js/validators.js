// ============================================================================
//  Kiem tra dau vao o phia trinh duyet.
//
//  QUY TAC PHAI GIONG HET services/passwordService.js. Neu lech nhau thi
//  nguoi dung se thay form bao hop le roi server lai tu choi - rat kho hieu.
//  Server van la ben quyet dinh cuoi cung; day chi de phan hoi ngay khi go.
// ============================================================================

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

export function isValidEmail(email) {
    const value = String(email || '').trim().toLowerCase();
    return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function checkPassword(pw) {
    const value = typeof pw === 'string' ? pw : '';
    const rules = [
        { id: 'length', ok: value.length >= MIN_LENGTH && value.length <= MAX_LENGTH, label: `${MIN_LENGTH}–${MAX_LENGTH} ký tự` },
        { id: 'upper',  ok: /[A-Z]/.test(value), label: 'Có chữ hoa' },
        { id: 'digit',  ok: /[0-9]/.test(value), label: 'Có chữ số' }
    ];

    let score = rules.filter(r => r.ok).length;
    if (score === 3 && value.length >= 12 && /[^A-Za-z0-9]/.test(value)) score = 4;

    return { ok: rules.every(r => r.ok), score, rules };
}

export const STRENGTH_LABEL = ['', 'Rất yếu', 'Yếu', 'Mạnh', 'Rất mạnh'];

/* --- Gan / xoa loi tren tung o nhap ------------------------------------- */

export function setFieldError(input, message) {
    const field = input.closest('.field');
    if (!field) return;
    field.dataset.invalid = message ? 'true' : 'false';
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    const box = field.querySelector('.field-error');
    if (box) box.textContent = message || '';
}

export function clearErrors(form) {
    form.querySelectorAll('.field').forEach(f => { f.dataset.invalid = 'false'; });
    form.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(e => e.setAttribute('aria-invalid', 'false'));
    const box = form.querySelector('.form-error');
    if (box) box.dataset.show = 'false';
}

export function showFormError(form, message) {
    const box = form.querySelector('.form-error');
    if (!box) return;
    box.textContent = message;
    box.dataset.show = 'true';
}

export function showFormOk(form, message) {
    const box = form.querySelector('.form-ok');
    if (!box) return;
    box.textContent = message;
    box.dataset.show = 'true';
    setTimeout(() => { box.dataset.show = 'false'; }, 4000);
}

// Rai loi tra ve tu server vao dung o nhap tuong ung
export function applyServerErrors(form, error) {
    const fields = error && error.fields;
    let placed = false;

    if (fields) {
        for (const [name, message] of Object.entries(fields)) {
            const input = form.querySelector(`[name="${name}"]`);
            if (input) { setFieldError(input, message); placed = true; }
        }
    }
    if (!placed) showFormError(form, (error && error.message) || 'Có lỗi xảy ra, vui lòng thử lại');
}

export function setLoading(button, loading) {
    button.dataset.loading = String(loading);
    button.disabled = loading;
}
