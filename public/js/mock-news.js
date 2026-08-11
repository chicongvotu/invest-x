// Mock news data for Invest X trading platform

const CATEGORIES = [
    { id: 'market', name: 'Tin thị trường', emoji: '💰' },
    { id: 'tips', name: 'Mẹo giao dịch', emoji: '⚡' },
    { id: 'analysis', name: 'Phân tích', emoji: '🔬' }
];

const ARTICLES = [
    // TODAY (0-24 hours)
    {
        id: '1',
        title: 'Giá ngô kỳ hạn tăng 2.5% do lo ngại về mưa mùa hè',
        category: 'market',
        excerpt: 'Thị trường ngô ghi nhận sự tăng mạnh hôm nay khi các nhà đầu tư lo lắng về tác động tiềm tàng của điều kiện thời tiết.',
        content: 'Giá ngô kỳ hạn tăng 2.5% do lo ngại về mưa mùa hè.',
        image: '🌾',
        author: 'Nguyễn Công',
        publishedAt: Date.now() - 1 * 3600000,
        featured: true
    },
    {
        id: '2',
        title: 'Cách quản lý rủi ro hiệu quả khi giao dịch hàng hóa',
        category: 'tips',
        excerpt: 'Quản lý rủi ro là chìa khóa để thành công trong giao dịch. Hôm nay chúng tôi chia sẻ 5 kỹ thuật được chứng minh.',
        content: 'Quản lý rủi ro là chìa khóa để thành công trong giao dịch.',
        image: '🎯',
        author: 'Trần Minh',
        publishedAt: Date.now() - 8 * 3600000,
        featured: false
    },
    {
        id: '3',
        title: 'Phân tích chu kỳ thị trường lúa mì tuần này',
        category: 'analysis',
        excerpt: 'Phân tích chi tiết mô hình SMC trên biểu đồ hàng tuần của lúa mì kỳ hạn gần.',
        content: 'Phân tích chu kỳ thị trường lúa mì tuần này: Biểu đồ hàng tuần cho thấy FVG ở vùng 560-562.',
        image: '🔬',
        author: 'Phạm Anh',
        publishedAt: Date.now() - 15 * 3600000,
        featured: false
    },
    // PAST WEEK (25-168 hours)
    {
        id: '4',
        title: 'Thúc đẩy từ Fed: Tác động đến thị trường hàng hóa',
        category: 'market',
        excerpt: 'Quyết định lãi suất của Fed vừa rồi đã tạo ra làn sóng đảo chiều trên toàn bộ thị trường hàng hóa.',
        content: 'Thúc đẩy từ Fed: Tác động đến thị trường hàng hóa.',
        image: '💱',
        author: 'Lê Hoàng',
        publishedAt: Date.now() - 30 * 3600000,
        featured: false
    },
    {
        id: '5',
        title: 'Sử dụng hình thức Break of Structure (BOS) một cách chính xác',
        category: 'tips',
        excerpt: 'BOS là một trong những khái niệm cơ bản nhất trong phân tích SMC. Hãy học cách nhận biết nó chính xác.',
        content: 'Sử dụng hình thức Break of Structure (BOS) một cách chính xác.',
        image: '🚀',
        author: 'Nguyễn Công',
        publishedAt: Date.now() - 50 * 3600000,
        featured: true
    },
    {
        id: '6',
        title: 'Biểu đồ ngũ giác đậu tương: Chuẩn bị cho một bước đi lớn?',
        category: 'analysis',
        excerpt: 'Các chuyên gia nhận thấy một hình thành ngũ giác trên biểu đồ đậu tương. Điều này có thể dẫn đến một động thái mạnh.',
        content: 'Biểu đồ ngũ giác đậu tương: Chuẩn bị cho một bước đi lớn?',
        image: '📊',
        author: 'Trần Minh',
        publishedAt: Date.now() - 80 * 3600000,
        featured: false
    },
    // PAST MONTH (169-720 hours)
    {
        id: '7',
        title: 'Ngoại lệ: Giá khô đậu giảm 1% khi nguồn cung tăng',
        category: 'market',
        excerpt: 'Một số khác biệt với thị trường chung khi khô đậu ghi nhận sự giảm giá. Tìm hiểu chi tiết.',
        content: 'Ngoại lệ: Giá khô đậu giảm 1% khi nguồn cung tăng.',
        image: '📉',
        author: 'Phạm Anh',
        publishedAt: Date.now() - 200 * 3600000,
        featured: false
    },
    {
        id: '8',
        title: 'Momentum chỉ báo: Làm cách nào để sử dụng nó đúng cách',
        category: 'tips',
        excerpt: 'Momentum là một công cụ mạnh mẽ nhưng dễ bị lạm dụng. Đây là hướng dẫn đúng cách.',
        content: 'Momentum chỉ báo: Làm cách nào để sử dụng nó đúng cách.',
        image: '⚡',
        author: 'Lê Hoàng',
        publishedAt: Date.now() - 300 * 3600000,
        featured: false
    },
    {
        id: '9',
        title: 'Báo cáo vụ mùa: Sản lượng ngô toàn cầu sẽ giảm 2%',
        category: 'market',
        excerpt: 'Báo cáo vụ mùa cho biết sản lượng ngô toàn cầu dự kiến sẽ giảm 2% so với năm trước.',
        content: 'Báo cáo vụ mùa: Sản lượng ngô toàn cầu sẽ giảm 2%.',
        image: '📈',
        author: 'Nguyễn Công',
        publishedAt: Date.now() - 400 * 3600000,
        featured: true
    },
    // OLDER (>720 hours)
    {
        id: '10',
        title: 'Thiết lập tỷ lệ risk-reward: Bí quyết sinh lợi bền vững',
        category: 'tips',
        excerpt: 'Không phải tất cả các trade đều cần có tỷ lệ risk-reward 1:3. Tìm hiểu cách tối ưu hóa.',
        content: 'Thiết lập tỷ lệ risk-reward: Bí quyết sinh lợi bền vững.',
        image: '💹',
        author: 'Trần Minh',
        publishedAt: Date.now() - 800 * 3600000,
        featured: false
    },
    {
        id: '11',
        title: 'Chiến lược giao dịch theo chu kỳ kinh tế dài hạn',
        category: 'analysis',
        excerpt: 'Các nhà đầu tư dài hạn cần hiểu rõ chu kỳ kinh tế để đạt kết quả tốt nhất.',
        content: 'Chiến lược giao dịch theo chu kỳ kinh tế dài hạn.',
        image: '🧮',
        author: 'Phạm Anh',
        publishedAt: Date.now() - 1000 * 3600000,
        featured: false
    },
    {
        id: '12',
        title: 'Xu hướng thị trường quý trước: Những bài học quý báu',
        category: 'market',
        excerpt: 'Nhìn lại quý trước, có nhiều bài học từ những biến động thị trường lớn.',
        content: 'Xu hướng thị trường quý trước: Những bài học quý báu.',
        image: '💰',
        author: 'Lê Hoàng',
        publishedAt: Date.now() - 1200 * 3600000,
        featured: false
    }
];

// Seeded RNG for consistent data
function seedOf(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function rng(seed) {
    let a = typeof seed === 'string' ? seedOf(seed) : seed >>> 0;
    return function next() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// In-memory storage for articles (simulating DB)
let articlesStorage = [...ARTICLES];
let nextId = 11;

const newsApi = {
    // Get all articles with optional filtering
    list(filters = {}) {
        const { category, limit = 20, offset = 0 } = filters;
        let results = articlesStorage.slice();

        if (category) {
            results = results.filter(a => a.category === category);
        }

        results = results.sort((a, b) => b.publishedAt - a.publishedAt);
        const total = results.length;
        const items = results.slice(offset, offset + limit);

        return {
            items,
            total,
            offset,
            limit,
            hasMore: offset + limit < total
        };
    },

    // Get single article by ID
    getById(id) {
        const article = articlesStorage.find(a => a.id === String(id));
        if (!article) return null;
        return { ...article };
    },

    // Create new article
    create(data) {
        const id = String(nextId++);
        const article = {
            id,
            title: data.title || 'Tin mới',
            category: data.category || 'market',
            excerpt: data.excerpt || '',
            content: data.content || '',
            image: data.image || '📰',
            author: data.author || 'Anonymous',
            publishedAt: data.publishedAt || Date.now(),
            featured: Boolean(data.featured)
        };
        articlesStorage.push(article);
        return article;
    },

    // Update article
    update(id, data) {
        const idx = articlesStorage.findIndex(a => a.id === String(id));
        if (idx === -1) return null;

        const article = articlesStorage[idx];
        articlesStorage[idx] = {
            ...article,
            title: data.title !== undefined ? data.title : article.title,
            category: data.category !== undefined ? data.category : article.category,
            excerpt: data.excerpt !== undefined ? data.excerpt : article.excerpt,
            content: data.content !== undefined ? data.content : article.content,
            image: data.image !== undefined ? data.image : article.image,
            author: data.author !== undefined ? data.author : article.author,
            featured: data.featured !== undefined ? Boolean(data.featured) : article.featured
        };
        return articlesStorage[idx];
    },

    // Delete article
    delete(id) {
        const idx = articlesStorage.findIndex(a => a.id === String(id));
        if (idx === -1) return null;
        const deleted = articlesStorage.splice(idx, 1);
        return deleted[0];
    },

    // Get categories
    categories() {
        return CATEGORIES;
    },

    // Search articles
    search(keyword) {
        const q = keyword.toLowerCase();
        return articlesStorage.filter(a =>
            a.title.toLowerCase().includes(q) ||
            a.excerpt.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q)
        );
    }
};

export default newsApi;
