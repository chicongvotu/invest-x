# API Audit - Hệ thống Invest X (Node.js)

## 📊 Tình trạng API hiện tại

### ✅ Backend Thực (1)
| API | Endpoint | Loại | Ghi chú |
|---|---|---|---|
| **Prices** | `GET /api/prices?symbols=ZC1!,ZC2!` | Backend | ✅ Chạy từ backend (`/api/prices` route) |

**Chi tiết:**
```javascript
// server.js - Line 19-22
app.get('/api/prices', (req, res) => {
    const symbols = String(req.query.symbols || '').split(',').filter(Boolean);
    res.json({ items: prices(symbols) });
});
```

---

### 📋 Mock API Phía Client (26)
Tất cả chạy từ `public/js/api.js` → `public/js/mock.js`

#### **GET Endpoints**
| API | Endpoint | Mock Logic | Ghi chú |
|---|---|---|---|
| **Signals** | `GET /api/signals?...` | `mock.signals()` | Lấy list tín hiệu SMC |
| **Signals Detail** | `GET /api/signals/{id}` | `mock.signalById()` | Chi tiết 1 tín hiệu |
| **Stats** | `GET /api/stats` | `mock.stats()` | Thống kê chung (60 tín hiệu, winrate, R) |
| **Equity** | `GET /api/stats/equity` | `mock.equity()` | Biểu đồ equity curve |
| **Bot State** | `GET /api/bot/state?symbol=ZC1!` | `mock.botState()` | Trạng thái bot cho 1 symbol |
| **Bot Overview** | `GET /api/bot/overview?...` | `mock.botOverview()` | Tổng quan bot |
| **Bot Config** | `GET /api/bot/config` | `mock.botConfig()` | Cấu hình bot |
| **Bot Rules** | `GET /api/bot/rules` | `mock.botRules()` | Quy tắc bot (SMC, BOS, CHoCH) |
| **Health** | `GET /api/health` | Inline | Status: `{ok: true, mode: 'mock'}` |
| **Me** | `GET /api/auth/me` | `mock.session.user()` | User hiện tại (sau auth) |
| **Sessions** | `GET /api/auth/sessions` | `mock.sessions()` | Danh sách phiên đăng nhập |
| **Events** | `GET /api/auth/events?limit=12` | `mock.events()` | Lịch sử hoạt động user |
| **Watchlist** | `GET /api/me/watchlist` | `requireAuth()` | List symbol theo dõi |

#### **POST Endpoints**
| API | Endpoint | Mock Logic | Ghi chú |
|---|---|---|---|
| **Backtest** | `POST /api/backtest` | `mock.backtest()` | Chạy backtest strategy |
| **Login** | `POST /api/auth/login` | `mock.session.login()` | Đăng nhập |
| **Register** | `POST /api/auth/register` | `mock.session.login()` | Đăng ký |
| **Logout** | `POST /api/auth/logout` | `mock.session.logout()` | Đăng xuất |
| **Change Password** | `POST /api/auth/change-password` | Inline | Đổi mật khẩu |
| **Bot Scan** | `POST /api/bot/scan` | Inline | Quét market |
| **Bot Evaluate** | `POST /api/bot/evaluate` | Inline | Đánh giá tín hiệu |

#### **PUT Endpoints**
| API | Endpoint | Mock Logic | Ghi chú |
|---|---|---|---|
| **Profile** | `PUT /api/auth/profile` | `mock.session.update()` | Cập nhật profile |
| **Watchlist** | `PUT /api/me/watchlist` | `mock.session.update()` | Cập nhật watchlist |
| **Alerts** | `PUT /api/me/alerts` | `mock.session.update()` | Cấu hình alert |

#### **DELETE Endpoints**
| API | Endpoint | Mock Logic | Ghi chú |
|---|---|---|---|
| **Revoke Session** | `DELETE /api/auth/sessions/{id}` | `mock.revokeSession()` | Hủy phiên |

---

## 🎯 Cần Implement (Phần Tin Tức)

### ❌ Missing: News API (0/7)
| API | Endpoint | Trạng thái | Ưu tiên |
|---|---|---|---|
| List | `GET /api/news/articles?category=X&limit=20` | ❌ Missing | 🔴 High |
| Detail | `GET /api/news/articles/{id}` | ❌ Missing | 🔴 High |
| Create | `POST /api/news/articles` | ❌ Missing | 🟡 Medium |
| Update | `PUT /api/news/articles/{id}` | ❌ Missing | 🟡 Medium |
| Delete | `DELETE /api/news/articles/{id}` | ❌ Missing | 🟡 Medium |
| Categories | `GET /api/news/categories` | ❌ Missing | 🟢 Low |
| Schedule | `POST /api/news/publish-schedule` | ❌ Missing | 🟡 Medium |

---

## 📈 Summary

| Metric | Count |
|---|---|
| **Backend API** | 1 (prices) |
| **Mock API** | 26 |
| **Total API** | 27 |
| **Coverage** | 96% mock, 4% real |
| **Status** | ⚠️ Prototype phase |

---

## 🚀 Next Steps (MVP)

### Phase 1: News API (Backend)
1. Create `/api/news/articles` - GET (list + filter)
2. Create `/api/news/articles/{id}` - GET (detail)
3. Create `/api/news/articles` - POST (create, admin only)
4. Create `/api/news/articles/{id}` - PUT (update, admin only)
5. Create `/api/news/articles/{id}` - DELETE (delete, admin only)
6. (Optional) Categories API

### Phase 2: Frontend Integration
- Add news page UI
- Add admin panel for CRUD
- Add schedule publish form

### Phase 3: Database
- Connect Firestore (or keep mock for now)
- Setup Cloud Tasks for scheduling

---

## 💡 Recommendation

**Cách tiếp cận từng bước:**
1. **Week 1:** Backend News API (6 endpoints) + Firestore
2. **Week 2:** Frontend News page + Admin panel
3. **Week 3:** Schedule publishing + Cloud Tasks

**Hoặc nhanh hơn (2-3 ngày):**
- Mock news API trước → frontend chạy
- Implement backend + Firestore sau
