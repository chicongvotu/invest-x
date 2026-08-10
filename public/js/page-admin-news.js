import { api } from './api.js';

let allArticles = [];

// Switch between tabs
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(tab + '-tab')?.classList.add('active');
    event.target?.classList.add('active');

    if (tab === 'list') {
        loadArticlesList();
    }
}

// Show message
function showMessage(text, type = 'success') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Create article form
document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        excerpt: document.getElementById('excerpt').value,
        content: document.getElementById('content').value,
        author: document.getElementById('author').value,
        image: document.getElementById('image').value || '📰',
        featured: document.getElementById('featured').checked,
        publishedAt: Date.now()
    };

    try {
        await api.post('/api/news/articles', data);
        showMessage('✅ Bài viết đã được tạo thành công!', 'success');
        document.getElementById('createForm').reset();
    } catch (err) {
        showMessage('❌ Lỗi: ' + err.message, 'error');
    }
});

// Load articles list
async function loadArticlesList() {
    try {
        const result = await api.get('/api/news/articles', { limit: 1000 });
        allArticles = result.items || [];
        renderArticlesList();
    } catch (err) {
        showMessage('❌ Lỗi tải bài viết: ' + err.message, 'error');
    }
}

function renderArticlesList() {
    const container = document.getElementById('articlesList');

    if (allArticles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>Chưa có bài viết nào</p>
            </div>
        `;
        return;
    }

    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Tiêu Đề</th>
                    <th>Danh Mục</th>
                    <th>Tác Giả</th>
                    <th>Ngày Đăng</th>
                    <th>Thao Tác</th>
                </tr>
            </thead>
            <tbody>
                ${allArticles.map(article => `
                    <tr>
                        <td>
                            <span class="article-title">${escapeHtml(article.title)}</span>
                            ${article.featured ? '⭐' : ''}
                        </td>
                        <td>${article.category}</td>
                        <td>${escapeHtml(article.author)}</td>
                        <td>${new Date(article.publishedAt).toLocaleDateString('vi-VN')}</td>
                        <td>
                            <div class="article-actions">
                                <button class="btn btn-secondary btn-small" onclick="editArticle('${article.id}')">✏️ Sửa</button>
                                <button class="btn btn-danger btn-small" onclick="deleteArticle('${article.id}')">🗑️ Xóa</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Edit article
async function editArticle(id) {
    const article = allArticles.find(a => a.id === id);
    if (!article) return;

    document.getElementById('editId').value = id;
    document.getElementById('editTitle').value = article.title;
    document.getElementById('editCategory').value = article.category;
    document.getElementById('editExcerpt').value = article.excerpt;
    document.getElementById('editContent').value = article.content;
    document.getElementById('editAuthor').value = article.author;
    document.getElementById('editImage').value = article.image;
    document.getElementById('editFeatured').checked = article.featured;

    document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('open');
}

// Update article form
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const data = {
        title: document.getElementById('editTitle').value,
        category: document.getElementById('editCategory').value,
        excerpt: document.getElementById('editExcerpt').value,
        content: document.getElementById('editContent').value,
        author: document.getElementById('editAuthor').value,
        image: document.getElementById('editImage').value,
        featured: document.getElementById('editFeatured').checked
    };

    try {
        await api.put(`/api/news/articles/${id}`, data);
        showMessage('✅ Bài viết đã được cập nhật!', 'success');
        closeEditModal();
        loadArticlesList();
    } catch (err) {
        showMessage('❌ Lỗi: ' + err.message, 'error');
    }
});

// Delete article
async function deleteArticle(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;

    try {
        await api.delete(`/api/news/articles/${id}`);
        showMessage('✅ Bài viết đã được xóa!', 'success');
        loadArticlesList();
    } catch (err) {
        showMessage('❌ Lỗi: ' + err.message, 'error');
    }
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

// Expose functions globally
window.switchTab = switchTab;
window.editArticle = editArticle;
window.closeEditModal = closeEditModal;
window.deleteArticle = deleteArticle;
