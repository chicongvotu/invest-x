# System Design: Invest X - News Module + Backend

## Architecture Overview

```
┌─────────────────────────────────────┐
│    Vercel (Frontend - React/HTML)   │
│  - /public/* (static assets)        │
│  - /views/* (HTML templates)        │
│  - API calls → Go backend           │
└──────────────┬──────────────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────────────────────┐
│      Google Cloud Run (Go Backend)           │
│  ├─ /api/news/articles (GET/POST/PUT/DEL)   │
│  ├─ /api/news/articles/{id}                 │
│  ├─ /api/news/categories                    │
│  ├─ /api/news/publish-schedule              │
│  ├─ /api/prices (từ mock data sau)          │
│  └─ /health                                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│      Firestore (Database)                    │
│  ├─ articles/{id}                           │
│  ├─ schedules/{id}                          │
│  ├─ categories/{id}                         │
│  └─ images (URL stored in articles)         │
└──────────────────────────────────────────────┘
```

## Repository Structure (Post-Plan)

```
invest-x/
├── frontend/                    # Vercel deployment
│   ├── public/                  # Static assets (from Archive)
│   ├── views/                   # HTML templates
│   ├── package.json
│   └── vercel.json              # Vercel config
│
├── backend/                     # Go backend (CloudRun)
│   ├── cmd/
│   │   └── server/
│   │       └── main.go          # Entry point
│   ├── internal/
│   │   ├── api/
│   │   │   ├── handlers.go      # HTTP handlers
│   │   │   ├── news.go          # News endpoints
│   │   │   └── middleware.go    # Auth, CORS
│   │   ├── models/
│   │   │   └── article.go       # Data structures
│   │   ├── db/
│   │   │   ├── firestore.go     # Firestore client
│   │   │   └── articles.go      # Article repo
│   │   ├── service/
│   │   │   └── news_service.go  # Business logic
│   │   └── scheduler/
│   │       └── publish.go       # Schedule publishing
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile               # CloudRun deployment
│   └── .env.example
│
└── docs/
    ├── API.md                   # API specs
    └── DEPLOYMENT.md            # Deploy guide
```

## Phase 1: MVP (Day 1)

### Backend API Endpoints

**News Management:**
```
GET    /api/news/articles?category=X&limit=20     (user - list)
GET    /api/news/articles/{id}                     (user - detail)
POST   /api/news/articles                          (admin - create)
PUT    /api/news/articles/{id}                     (admin - update)
DELETE /api/news/articles/{id}                     (admin - delete)

GET    /api/news/categories                         (public)
POST   /api/news/publish-schedule                  (admin - schedule)
```

**Request/Response Schema:**

```json
// Article
{
  "id": "article_001",
  "title": "Giá ngô tăng 5% tuần này",
  "content": "...",
  "category": "MARKET_NEWS",
  "imageUrl": "https://storage.googleapis.com/...",
  "videoUrl": "",
  "createdAt": "2026-08-10T10:30:00Z",
  "publishedAt": "2026-08-10T14:00:00Z",
  "status": "PUBLISHED",
  "views": 234,
  "authorId": "user_123"
}

// Create request
{
  "title": "...",
  "content": "...",
  "category": "MARKET_NEWS",
  "imageUrl": "...",
  "publishAt": "2026-08-10T14:00:00Z"  // Optional - if schedule
}
```

### Firestore Schema

```firestore
/articles/{id}
  - title: string
  - content: string
  - category: string (enum: MARKET_NEWS, TRADING_TIPS, ANALYSIS)
  - imageUrl: string
  - videoUrl: string
  - createdAt: timestamp
  - publishedAt: timestamp
  - status: string (DRAFT, SCHEDULED, PUBLISHED, ARCHIVED)
  - views: int
  - authorId: string
  - updatedAt: timestamp

/schedules/{id}
  - articleId: string (ref to /articles)
  - scheduledTime: timestamp
  - status: string (PENDING, COMPLETED, FAILED)
  - createdAt: timestamp

/categories/{id}
  - name: string
  - slug: string
  - description: string
```

## Phase 2: Later (Post-MVP)

- Migrate `/api/prices` từ mock.js → Go backend
- Add real-time WebSocket updates
- Add search + full-text indexing
- Add image upload handler (CloudStorage)
- Add user engagement (views, likes)

## Technology Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | HTML/JS/CSS | Vercel free tier, no build step needed |
| Backend | Go 1.22 | Fast, serverless-ready, easy deploy |
| Database | Firestore | Free tier (50k reads/day), auto-scaling |
| Hosting | CloudRun | Pay-per-request (~$0-5/month) |
| Auth | API Key (simple) | No complexity, easy to add Firebase later |
| Scheduler | Cloud Tasks | Free 500 calls/day |

## Cost Estimate (Monthly)

- **Vercel**: $0 (free tier)
- **CloudRun**: $0-5 (pay-per-request, usually free tier)
- **Firestore**: $0 (free tier: 50k reads, 20k writes)
- **Cloud Storage**: $0 (5GB free)
- **Total**: $0-5/month ✅

## Deployment Timeline (1 Day)

| Time | Task | Duration |
|---|---|---|
| 08:00-08:30 | Setup GCP project + Firestore + service account | 30m |
| 08:30-10:30 | Backend Go setup + data models + handlers | 2h |
| 10:30-12:30 | Firestore repository + publish scheduler | 2h |
| 12:30-13:00 | Lunch | 30m |
| 13:00-14:30 | Frontend: news page + admin form (update mock → real API) | 1.5h |
| 14:30-15:30 | Deploy CloudRun + Vercel | 1h |
| 15:30-16:30 | Testing + fixes | 1h |

**Total: 9 hours → Release by 17:00**

## Key Decisions

✅ **Chosen:** Firestore (cheaper, no DB management)
✅ **Chosen:** CloudRun (serverless, pay-per-request)
✅ **Chosen:** API Key auth (simple MVP, Firebase Auth later)
✅ **Chosen:** Move frontend to `/frontend` folder for Vercel
✅ **Chosen:** Keep existing mock data during transition

## Next Steps

1. ✅ Setup GCP + Firestore
2. ✅ Create Go project structure
3. ✅ Implement news API handlers
4. ✅ Implement Firestore repository
5. ✅ Update frontend to call real API
6. ✅ Deploy to CloudRun + Vercel
7. ✅ Test end-to-end
