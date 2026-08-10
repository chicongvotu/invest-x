import { api, ApiError } from './api.js';
import { attachPasswordMeter, attachPasswordToggle } from './password-meter.js';
import {
    isValidEmail, checkPassword, setFieldError, clearErrors,
    showFormError, applyServerErrors, setLoading
} from './validators.js';

// ============================================================================
//  Xu ly form dang nhap va dang ky.
// ============================================================================

// Chi cho phep quay ve duong dan noi bo. Bo qua buoc nay thi
// /login?next=https://evil.com tro thanh lo hong open redirect.
// Server cung kiem tra lai (services/authService.js safeNext).
function safeNext() {
    const raw = new URLSearchParams(location.search).get('next');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
    return raw;
}

function initLogin(form) {
    const email = form.querySelector('[name="email"]');
    const pw = form.querySelector('[name="password"]');
    const submit = form.querySelector('[type="submit"]');
    attachPasswordToggle(pw);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submit.disabled) return;             // chan bam hai lan
        clearErrors(form);

        if (!isValidEmail(email.value)) {
            setFieldError(email, 'Email không hợp lệ');
            email.focus();
            return;
        }
        if (!pw.value) {
            setFieldError(pw, 'Vui lòng nhập mật khẩu');
            pw.focus();
            return;
        }

        setLoading(submit, true);
        try {
            await api.post('/api/auth/login', {
                email: email.value.trim(),
                password: pw.value
            }, { retries: 0 });
            location.href = safeNext();
        } catch (err) {
            setLoading(submit, false);
            if (err instanceof ApiError && err.code === 'ACCOUNT_LOCKED') {
                showFormError(form, err.message);
            } else if (err instanceof ApiError) {
                applyServerErrors(form, err);
            } else {
                showFormError(form, 'Không kết nối được máy chủ');
            }
            pw.select();
        }
    });
}

function initRegister(form) {
    const email = form.querySelector('[name="email"]');
    const pw = form.querySelector('[name="password"]');
    const name = form.querySelector('[name="displayName"]');
    const terms = form.querySelector('[name="agreeTerms"]');
    const submit = form.querySelector('[type="submit"]');

    attachPasswordToggle(pw);
    const checkMeter = attachPasswordMeter(pw, form.querySelector('.pw-block'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submit.disabled) return;
        clearErrors(form);

        if (!isValidEmail(email.value)) {
            setFieldError(email, 'Email không hợp lệ');
            email.focus();
            return;
        }
        const strength = checkPassword(pw.value);
        if (!strength.ok) {
            const missing = strength.rules.find(r => !r.ok);
            setFieldError(pw, `Mật khẩu chưa đạt: ${missing.label.toLowerCase()}`);
            pw.focus();
            return;
        }
        if (!terms.checked) {
            setFieldError(terms, 'Bạn cần đồng ý với điều khoản dịch vụ');
            terms.focus();
            return;
        }

        setLoading(submit, true);
        try {
            await api.post('/api/auth/register', {
                email: email.value.trim(),
                password: pw.value,
                displayName: name ? name.value.trim() : '',
                agreeTerms: true
            }, { retries: 0 });
            location.href = safeNext();
        } catch (err) {
            setLoading(submit, false);
            if (err instanceof ApiError) applyServerErrors(form, err);
            else showFormError(form, 'Không kết nối được máy chủ');
        }
    });

    checkMeter();
}

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
if (loginForm) initLogin(loginForm);
if (registerForm) initRegister(registerForm);
