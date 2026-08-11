import { api } from './api.js';

const LIMIT = 4;
let currentPage = 1;
let currentCategory = null;
let currentTimeFilter = 'all';
let searchQuery = '';
let allArticles = [];
let filteredArticles = [];

async function loadNews() {
    try {
        const result = await api.get('/api/news/articles?limit=1000');
        allArticles = result.items || [];
        filterAndPaginate();
    } catch (err) {
        showError('Lỗi tải tin tức: ' + err.message);
    }
}


async function loadCategories() {
    try {
        const result = await api.get('/api/news/categories');
        const categories = result.categories || [];

        const filtersDiv = document.getElementById('filters');
        filtersDiv.innerHTML = '';

        // All button
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.textContent = '📌 Tất cả';
        allBtn.onclick = () => {
            currentCategory = null;
            currentPage = 1;
            filterAndPaginate();
            updateFilterButtons();
        };
        filtersDiv.appendChild(allBtn);

        // Category buttons
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = `${cat.emoji} ${cat.name}`;
            btn.onclick = () => {
                currentCategory = cat.id;
                currentPage = 1;
                filterAndPaginate();
                updateFilterButtons();
            };
            filtersDiv.appendChild(btn);
        });
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function filterAndPaginate() {
    let results = allArticles;

    // Filter by category
    if (currentCategory) {
        results = results.filter(a => a.category === currentCategory);
    }

    // Filter by time
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const beforeTimeFilter = results.length;
    if (currentTimeFilter === 'today') {
        results = results.filter(a => now - a.publishedAt <= oneDay);
    } else if (currentTimeFilter === 'week') {
        results = results.filter(a => now - a.publishedAt <= oneWeek);
    } else if (currentTimeFilter === 'month') {
        results = results.filter(a => now - a.publishedAt <= oneMonth);
    }
    console.log(`[Filter] timeFilter="${currentTimeFilter}" before=${beforeTimeFilter} after=${results.length}`);

    // Filter by search
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        results = results.filter(a =>
            a.title.toLowerCase().includes(q) ||
            a.excerpt.toLowerCase().includes(q)
        );
    }

    filteredArticles = results.sort((a, b) => b.publishedAt - a.publishedAt);
    currentPage = 1;
    renderNews();
    renderPagination();
}

function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach((btn, idx) => {
        if (idx === 0 && !currentCategory) {
            btn.classList.add('active');
        } else if (idx > 0) {
            btn.classList.remove('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));

    const btns = document.querySelectorAll('.filter-btn');
    if (!currentCategory) {
        btns[0]?.classList.add('active');
    } else {
        btns.forEach(btn => {
            if (btn.textContent.includes(currentCategory)) {
                btn.classList.add('active');
            }
        });
    }
}

function renderNews() {
    const start = (currentPage - 1) * LIMIT;
    const end = start + LIMIT;
    const pageArticles = filteredArticles.slice(start, end);

    const newsList = document.getElementById('newsList');
    newsList.innerHTML = '';

    if (pageArticles.length === 0) {
        newsList.innerHTML = '<div class="loading">Không tìm thấy bài viết</div>';
        return;
    }

    pageArticles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'news-card' + (article.featured ? ' featured' : '');

        const pubDate = new Date(article.publishedAt).toLocaleDateString('vi-VN');

        card.innerHTML = `
            <div class="news-image" style="position: relative;">
                ${article.image}
                ${article.featured ? '<div class="news-badge">Nổi bật</div>' : ''}
            </div>
            <div class="news-content">
                <div class="news-category">${article.category}</div>
                <h3 class="news-title">${escapeHtml(article.title)}</h3>
                <p class="news-excerpt">${escapeHtml(article.excerpt)}</p>
                <div class="news-footer">
                    <div class="news-meta">
                        <span>✍️ ${escapeHtml(article.author)}</span>
                        <span>📅 ${pubDate}</span>
                    </div>
                </div>
            </div>
        `;

        card.onclick = () => openArticle(article);
        newsList.appendChild(card);
    });
}

function renderPagination() {
    const totalPages = Math.ceil(filteredArticles.length / LIMIT);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&larr;';
    prevBtn.title = 'Trang trước';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderNews();
            renderPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    pagination.appendChild(prevBtn);

    // Smart page numbers with ellipsis
    const pagesWindow = 2; // Pages to show around current page
    const pagesToShow = new Set();

    // Always show first page
    pagesToShow.add(1);

    // Show pages around current page
    for (let i = Math.max(1, currentPage - pagesWindow); i <= Math.min(totalPages, currentPage + pagesWindow); i++) {
        pagesToShow.add(i);
    }

    // Always show last page if totalPages > 1
    if (totalPages > 1) pagesToShow.add(totalPages);

    const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);

    for (let i = 0; i < sortedPages.length; i++) {
        const page = sortedPages[i];
        const nextPage = sortedPages[i + 1];

        // Add ellipsis if there's a gap
        if (nextPage && nextPage - page > 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'ellipsis';
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }

        // Add page button
        const btn = document.createElement('button');
        btn.textContent = String(page);
        if (page === currentPage) btn.classList.add('active');
        btn.onclick = () => {
            currentPage = page;
            renderNews();
            renderPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        pagination.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&rarr;';
    nextBtn.title = 'Trang tiếp';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderNews();
            renderPagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    pagination.appendChild(nextBtn);
}

function openArticle(article) {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');

    const pubDate = new Date(article.publishedAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    modalBody.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px; text-align: center;">
            ${article.image}
        </div>
        <h2 class="article-title">${escapeHtml(article.title)}</h2>
        <div class="article-meta">
            <span>✍️ ${escapeHtml(article.author)}</span>
            <span>📅 ${pubDate}</span>
            <span class="news-category" style="margin: 0;">${article.category}</span>
        </div>
        <div class="article-content">
            ${escapeHtml(article.content)}
        </div>
    `;

    modal.classList.add('open');
}

function closeModal() {
    document.getElementById('newsModal').classList.remove('open');
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Close modal on outside click
document.addEventListener('DOMContentLoaded', () => {
    console.log('[NEWS] DOMContentLoaded');

    document.getElementById('newsModal').addEventListener('click', (e) => {
        if (e.target.id === 'newsModal') {
            closeModal();
        }
    });

    // Time filter buttons
    const timeButtons = document.querySelectorAll('.time-filter-btn');
    console.log(`[NEWS] Found ${timeButtons.length} time filter buttons`);
    timeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`[NEWS] Clicked time filter: ${btn.dataset.filter}`);
            document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeFilter = btn.dataset.filter;
            console.log(`[NEWS] Set currentTimeFilter to: ${currentTimeFilter}`);
            filterAndPaginate();
        });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            filterAndPaginate();
        });
    }

    loadCategories();
    loadNews();
});

// Expose closeModal globally
window.closeModal = closeModal;
