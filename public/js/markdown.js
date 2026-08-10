// ============================================================================
//  Renderer Markdown toi gian, chi phu cho dung tap cu phap ma
//  docs/SMC-RULES.md dang dung: tieu de, danh sach, bang, khoi ma, trich dan,
//  in dam, ma inline, duong ke ngang.
//
//  Khong keo thu vien markdown ve chi de hien mot file cua chinh minh.
//  Van escape HTML TRUOC khi xu ly: file nay do server doc tu dia, nhung
//  nguyen tac la khong bao gio tin noi dung nao di vao innerHTML.
// ============================================================================

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function slugify(text) {
    return String(text)
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// In dam, nghieng, ma inline - ap dung tren chuoi DA escape
function inline(text) {
    return text
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

function renderTable(lines) {
    const split = (row) => row.replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
    const head = split(lines[0]);
    const body = lines.slice(2).map(split);

    return '<div class="md-table-wrap"><table class="md-table"><thead><tr>'
        + head.map(c => `<th>${c}</th>`).join('')
        + '</tr></thead><tbody>'
        + body.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('')
        + '</tbody></table></div>';
}

export function renderMarkdown(source) {
    const lines = escapeHtml(String(source || '')).split('\n');
    const out = [];
    const headings = [];

    let i = 0;
    let listOpen = false;

    const closeList = () => {
        if (listOpen) { out.push('</ul>'); listOpen = false; }
    };

    while (i < lines.length) {
        const line = lines[i];

        // Khoi ma ```
        if (/^```/.test(line)) {
            closeList();
            const buf = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
            i++;
            out.push(`<pre class="md-code"><code>${buf.join('\n')}</code></pre>`);
            continue;
        }

        // Bang: dong tieu de + dong ngan cach
        if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1])) {
            closeList();
            const buf = [];
            while (i < lines.length && /^\|/.test(lines[i])) buf.push(lines[i++]);
            out.push(renderTable(buf));
            continue;
        }

        // Tieu de
        const h = line.match(/^(#{1,4})\s+(.*)$/);
        if (h) {
            closeList();
            const level = h[1].length;
            const text = inline(h[2]);
            const id = slugify(h[2]);
            if (level <= 2) headings.push({ id, text, level });
            out.push(`<h${level} id="${id}" class="md-h${level}">${text}</h${level}>`);
            i++;
            continue;
        }

        // Duong ke ngang
        if (/^---+$/.test(line.trim())) {
            closeList();
            out.push('<hr class="md-hr">');
            i++;
            continue;
        }

        // Trich dan
        if (/^&gt;\s?/.test(line)) {
            closeList();
            const buf = [];
            while (i < lines.length && /^&gt;\s?/.test(lines[i])) {
                buf.push(lines[i].replace(/^&gt;\s?/, ''));
                i++;
            }
            out.push(`<blockquote class="md-quote">${inline(buf.join(' '))}</blockquote>`);
            continue;
        }

        // Danh sach
        const li = line.match(/^[-*]\s+(.*)$/);
        if (li) {
            if (!listOpen) { out.push('<ul class="md-list">'); listOpen = true; }
            out.push(`<li>${inline(li[1])}</li>`);
            i++;
            continue;
        }

        // Dong trong
        if (line.trim() === '') {
            closeList();
            i++;
            continue;
        }

        // Doan van thuong
        closeList();
        out.push(`<p class="md-p">${inline(line)}</p>`);
        i++;
    }

    closeList();
    return { html: out.join('\n'), headings };
}

export function renderToc(headings) {
    if (!headings.length) return '';
    return '<nav class="md-toc" aria-label="Mục lục"><ul>'
        + headings.map(h => `<li class="lv${h.level}"><a href="#${h.id}" data-toc="${h.id}">${h.text}</a></li>`).join('')
        + '</ul></nav>';
}
