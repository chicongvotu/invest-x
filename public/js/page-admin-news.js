// Firebase and auth are initialized in HTML inline script
// Access via: window.auth, window.storage

let allArticles = [];

// Upload Image to Firebase Storage
async function uploadImageToStorage(file) {
  if (!file) return null;

  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Vui lòng đăng nhập trước');
      return null;
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Chỉ chấp nhận file ảnh (JPG, PNG, WebP...)');
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh không vượt quá 5MB');
      return null;
    }

    // Upload
    document.getElementById('uploadStatus').textContent = 'Đang tải lên...';
    const timestamp = Date.now();
    const fileName = `articles/${timestamp}-${file.name}`;
    const storageRef = window.storage.ref(fileName);

    await storageRef.put(file, {
      metadata: {
        contentType: file.type,
        customMetadata: { uploadedBy: user.email }
      }
    });

    // Get download URL
    const imageUrl = await storageRef.getDownloadURL();
    document.getElementById('uploadStatus').textContent = '✅ Tải lên thành công';

    return imageUrl;
  } catch (error) {
    console.error('Upload error:', error);
    document.getElementById('uploadStatus').textContent = '❌ Lỗi: ' + error.message;
    alert('Lỗi tải ảnh: ' + error.message);
    return null;
  }
}

// Setup drag-drop
function setupImageUpload() {
  const uploadArea = document.getElementById('imageUploadArea');
  const fileInput = document.getElementById('imageFile');
  const previewDiv = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');

  if (!uploadArea || !fileInput) return;

  // Click to select
  uploadArea.addEventListener('click', () => fileInput.click());

  // Drag-drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--brand, #FCD535)';
    uploadArea.style.background = 'rgba(252, 213, 53, 0.05)';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'var(--border, #2B3139)';
    uploadArea.style.background = 'transparent';
  });

  uploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--border, #2B3139)';
    uploadArea.style.background = 'transparent';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Handle file selection
  async function handleFileSelect(file) {
    previewDiv.style.display = 'block';
    previewImg.src = URL.createObjectURL(file);

    const imageUrl = await uploadImageToStorage(file);
    if (imageUrl) {
      document.getElementById('imageUrl').value = imageUrl;
    }
  }
}

// Auth guard - check if admin using Firebase
function checkAdminAccess() {
    const user = window.auth.currentUser;

    if (!user) {
        location.href = '/login?next=/admin-news.html';
        return false;
    }

    // Check if user has admin claim
    user.getIdTokenResult().then((idTokenResult) => {
        if (idTokenResult.claims.admin !== true) {
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #ef4444;">
                    <h1>❌ Truy cập bị từ chối</h1>
                    <p>Bạn không có quyền truy cập trang admin này.</p>
                    <a href="/" style="color: var(--brand, #FCD535);">← Quay lại trang chủ</a>
                </div>
            `;
        }
    }).catch(() => {
        location.href = '/login?next=/admin-news.html';
    });

    return true;
}

// Switch between tabs
function switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(el => el.setAttribute('data-active', 'false'));
    document.querySelectorAll('.tab').forEach(el => el.setAttribute('aria-selected', 'false'));

    document.querySelector(`.tab-panel[data-tab="${tab}"]`)?.setAttribute('data-active', 'true');
    event.target?.setAttribute('aria-selected', 'true');

    if (tab === 'list') {
        loadArticlesList();
    } else if (tab === 'scheduled') {
        loadScheduledList();
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
        content: document.getElementById('content').value,
        imageUrl: document.getElementById('imageUrl').value || null,
        youtubeUrl: document.getElementById('youtubeUrl').value || null
    };

    // Validate required fields
    if (!data.title || !data.content) {
        showMessage('❌ Vui lòng điền đầy đủ: Tiêu đề và Nội dung', 'error');
        return;
    }

    try {
        // Get auth token
        const user = auth.currentUser;
        if (!user) {
            showMessage('❌ Vui lòng đăng nhập lại', 'error');
            location.href = '/login?next=/admin-news.html';
            return;
        }

        const idToken = await user.getIdToken();

        // Call backend API
        const response = await fetch('/api/admin/news', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Lỗi server');
        }

        showMessage('✅ Bài viết đã được đăng thành công!', 'success');
        document.getElementById('createForm').reset();
        document.getElementById('imageUrl').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        loadArticlesList();
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
    const published = allArticles.filter(a => !a.scheduledAt || a.scheduledAt <= Date.now());

    if (published.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>Chưa có bài viết đăng nào</p>
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
                ${published.map(article => `
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

// Load and render scheduled articles
async function loadScheduledList() {
    try {
        const result = await api.get('/api/news/articles', { limit: 1000 });
        allArticles = result.items || [];
        renderScheduledList();
    } catch (err) {
        showMessage('❌ Lỗi tải bài viết: ' + err.message, 'error');
    }
}

function renderScheduledList() {
    const container = document.getElementById('scheduledList');
    const scheduled = allArticles.filter(a => a.scheduledAt && a.scheduledAt > Date.now());

    if (scheduled.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏰</div>
                <p>Không có bài viết nào được lên lịch</p>
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
                    <th>Sẽ đăng lúc</th>
                    <th>Thao Tác</th>
                </tr>
            </thead>
            <tbody>
                ${scheduled.sort((a, b) => a.scheduledAt - b.scheduledAt).map(article => `
                    <tr>
                        <td>
                            <span class="article-title">${escapeHtml(article.title)}</span>
                        </td>
                        <td>${article.category}</td>
                        <td>${new Date(article.scheduledAt).toLocaleString('vi-VN')}</td>
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
    document.getElementById('editImageUrl').value = article.imageUrl || '';
    document.getElementById('editYoutubeUrl').value = article.youtubeUrl || '';
    document.getElementById('editFeatured').checked = article.featured;

    // Set scheduled date if exists
    if (article.scheduledAt) {
        const date = new Date(article.scheduledAt);
        const localDateTime = date.toISOString().slice(0, 16);
        document.getElementById('editScheduledAt').value = localDateTime;
    } else {
        document.getElementById('editScheduledAt').value = '';
    }

    document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('open');
}

// Update article form
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const scheduledAtInput = document.getElementById('editScheduledAt').value;
    const scheduledAt = scheduledAtInput ? new Date(scheduledAtInput).getTime() : null;

    const data = {
        title: document.getElementById('editTitle').value,
        category: document.getElementById('editCategory').value,
        excerpt: document.getElementById('editExcerpt').value,
        content: document.getElementById('editContent').value,
        author: document.getElementById('editAuthor').value,
        image: document.getElementById('editImage').value,
        imageUrl: document.getElementById('editImageUrl').value || null,
        youtubeUrl: document.getElementById('editYoutubeUrl').value || null,
        featured: document.getElementById('editFeatured').checked,
        scheduledAt: scheduledAt,
        status: scheduledAt ? 'scheduled' : 'published'
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

// Expose functions globally (called from init script in HTML)
window.switchTab = switchTab;
window.editArticle = editArticle;
window.closeEditModal = closeEditModal;
window.deleteArticle = deleteArticle;
window.checkAdminAccess = checkAdminAccess;
window.setupImageUpload = setupImageUpload;
window.loadArticlesList = loadArticlesList;
