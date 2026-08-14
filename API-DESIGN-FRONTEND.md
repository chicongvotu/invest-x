# API Design — Frontend Integration Guide

**Project:** Invest-X News Backend  
**Frontend Framework:** React / Vue / any  
**Backend:** Firebase Cloud Functions + Firestore  
**Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Frontend Integration Examples](#frontend-integration-examples)
7. [TypeScript Types](#typescript-types)
8. [Best Practices](#best-practices)

---

## API Overview

### Base URLs

```
Production: https://invest-x-pearl.vercel.app/api
Direct CF:  https://asia-southeast1-invest-x-505513.cloudfunctions.net/api
Local Dev:  http://localhost:5001/invest-x-505513/asia-southeast1/api (Firebase Emulator)
```

### Environment Configuration

```javascript
// config.js
const API_CONFIG = {
  PROD: 'https://invest-x-pearl.vercel.app/api',
  DEV: 'http://localhost:5001/invest-x-505513/asia-southeast1/api'
};

export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? API_CONFIG.PROD 
  : API_CONFIG.DEV;
```

### Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "count": 0
}
```

```json
{
  "error": "Error description"
}
```

---

## Authentication

### Firebase Auth Setup (Frontend)

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDX-56B0mIqTKZdWBZx7rI0vkrGRKJNrBg",
  authDomain: "invest-x-505513.firebaseapp.com",
  projectId: "invest-x-505513",
  storageBucket: "invest-x-505513.appspot.com",
  messagingSenderId: "829926289619",
  appId: "1:829926289619:web:YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Login
const loginAdmin = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  return token;
};
```

### Getting ID Token

```javascript
// Get token from currently logged-in user
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
};

// Refresh token (if expired)
const refreshToken = async () => {
  const user = auth.currentUser;
  if (user) {
    await user.getIdToken(true); // Force refresh
    return await user.getIdToken();
  }
};
```

### Token Validation

```javascript
// Check if user is admin
const isAdmin = async () => {
  const user = auth.currentUser;
  if (!user) return false;
  
  const idTokenResult = await user.getIdTokenResult();
  return idTokenResult.claims.admin === true;
};
```

---

## API Endpoints

### 1. GET /news — List All Articles

**Endpoint:** `GET /news`  
**Auth Required:** ❌ No  
**Rate Limit:** ✅ Yes (1000/hour)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "article-id-1",
      "title": "Breaking News",
      "content": "Article content...",
      "imageUrl": "https://example.com/image.jpg",
      "youtubeUrl": "https://youtu.be/...",
      "createdAt": "2026-08-14T10:00:00.000Z",
      "updatedAt": "2026-08-14T10:00:00.000Z",
      "createdBy": "user-uid",
      "createdByEmail": "admin@invest-x.com"
    }
  ],
  "count": 5
}
```

**Frontend Usage:**
```javascript
const fetchArticles = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/news`);
    const result = await response.json();
    
    if (result.success) {
      console.log('Articles:', result.data);
      console.log('Total:', result.count);
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Fetch failed:', error);
  }
};
```

---

### 2. POST /admin/news — Create Article

**Endpoint:** `POST /admin/news`  
**Auth Required:** ✅ Yes (admin claim)  
**Rate Limit:** ✅ Yes (100/hour)

**Request:**
```json
{
  "title": "Article Title",
  "content": "Full article content...",
  "imageUrl": "https://example.com/image.jpg",
  "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "auto-generated-id",
    "title": "Article Title",
    "content": "Full article content...",
    "imageUrl": "https://example.com/image.jpg",
    "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ",
    "createdAt": "2026-08-14T12:00:00.000Z"
  }
}
```

**Frontend Usage:**
```javascript
const createArticle = async (article) => {
  const token = await getAuthToken();
  if (!token) {
    console.error('Not authenticated');
    return;
  }

  const response = await fetch(`${API_BASE_URL}/admin/news`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: article.title,
      content: article.content,
      imageUrl: article.imageUrl,
      youtubeUrl: article.youtubeUrl
    })
  });

  const result = await response.json();
  
  if (response.status === 201) {
    console.log('Article created:', result.data);
    return result.data;
  } else if (response.status === 403) {
    console.error('You are not admin');
  } else {
    console.error('Error:', result.error);
  }
};
```

---

### 3. PUT /admin/news/:id — Update Article

**Endpoint:** `PUT /admin/news/{id}`  
**Auth Required:** ✅ Yes (admin claim)  
**Rate Limit:** ✅ Yes (200/hour)

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "imageUrl": "https://example.com/updated-image.jpg",
  "youtubeUrl": "https://youtu.be/updated"
}
```

**Note:** All fields are optional. Only send fields you want to update.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "article-id",
    "title": "Updated Title",
    "content": "Updated content...",
    "updatedAt": "2026-08-14T13:00:00.000Z"
  }
}
```

**Frontend Usage:**
```javascript
const updateArticle = async (articleId, updates) => {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/admin/news/${articleId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Article updated:', result.data);
    return result.data;
  } else {
    console.error('Error:', result.error);
  }
};
```

---

### 4. DELETE /admin/news/:id — Delete Article

**Endpoint:** `DELETE /admin/news/{id}`  
**Auth Required:** ✅ Yes (admin claim)  
**Rate Limit:** ✅ Yes (100/hour)

**Response:**
```json
{
  "success": true,
  "message": "Article article-id deleted"
}
```

**Frontend Usage:**
```javascript
const deleteArticle = async (articleId) => {
  const token = await getAuthToken();
  
  if (!confirm('Are you sure you want to delete this article?')) {
    return;
  }

  const response = await fetch(`${API_BASE_URL}/admin/news/${articleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Article deleted');
    return true;
  } else {
    console.error('Error:', result.error);
  }
};
```

---

## Data Models

### Article Object

```typescript
interface Article {
  id: string;                    // Auto-generated by Firestore
  title: string;                 // Required, max 200 chars
  content: string;               // Required, max 10000 chars
  imageUrl?: string | null;      // Optional, must be valid URL
  youtubeUrl?: string | null;    // Optional, must be youtu.be or youtube.com URL
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  createdBy: string;             // User UID (Firebase)
  createdByEmail: string;        // User email
  updatedBy?: string;            // User UID who last updated
}
```

### API Response Types

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  count?: number;
}

interface ErrorResponse {
  error: string;
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success (GET, PUT, DELETE) | Use data from response |
| 201 | Created (POST) | Use data from response, data is new |
| 400 | Bad Request | Validate form inputs |
| 401 | Unauthorized | User not logged in, show login |
| 403 | Forbidden | User not admin, show permission error |
| 404 | Not Found | Article deleted or ID wrong |
| 500 | Server Error | Show "Please try again later" |

### Error Response Examples

```json
{
  "error": "Missing or invalid authorization header"
}
```

```json
{
  "error": "User is not admin"
}
```

```json
{
  "error": "Title and content are required"
}
```

```json
{
  "error": "Article not found"
}
```

### Frontend Error Handler

```javascript
const handleApiError = (error, statusCode) => {
  switch (statusCode) {
    case 401:
      // Redirect to login
      window.location.href = '/login';
      break;
    case 403:
      // Show permission error
      alert('You do not have permission to perform this action');
      break;
    case 404:
      // Show not found error
      alert('Article not found or has been deleted');
      break;
    case 400:
      // Show validation error
      alert(`Input error: ${error}`);
      break;
    default:
      // Show generic error
      alert(`Error: ${error || 'Something went wrong'}`);
  }
};
```

---

## Frontend Integration Examples

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

const useArticles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/news`);
      const result = await response.json();
      
      if (result.success) {
        setArticles(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return { articles, loading, error, refetch: fetchArticles };
};

// Usage in Component
export const NewsList = () => {
  const { articles, loading, error } = useArticles();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {articles.map(article => (
        <div key={article.id}>
          <h2>{article.title}</h2>
          <p>{article.content}</p>
          {article.imageUrl && <img src={article.imageUrl} alt={article.title} />}
          {article.youtubeUrl && (
            <iframe 
              src={article.youtubeUrl.replace('youtu.be/', 'youtube.com/embed/')}
              frameBorder="0"
              allowFullScreen
            />
          )}
        </div>
      ))}
    </div>
  );
};
```

### React Admin Panel

```javascript
export const AdminNewsPanel = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const admin = await isAdmin();
    if (!admin) {
      alert('You do not have admin access');
      window.location.href = '/';
    }
  };

  const handleCreate = async () => {
    if (!title || !content) {
      alert('Title and content are required');
      return;
    }

    const article = await createArticle({
      title,
      content,
      imageUrl: imageUrl || null,
      youtubeUrl: youtubeUrl || null
    });

    if (article) {
      alert('Article created successfully');
      // Reset form
      setTitle('');
      setContent('');
      setImageUrl('');
      setYoutubeUrl('');
    }
  };

  return (
    <form>
      <input 
        type="text" 
        placeholder="Title" 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea 
        placeholder="Content" 
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input 
        type="url" 
        placeholder="Image URL" 
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <input 
        type="url" 
        placeholder="YouTube URL" 
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
      />
      <button onClick={handleCreate} type="button">
        Create Article
      </button>
    </form>
  );
};
```

---

## TypeScript Types

```typescript
// types/api.ts

export interface Article {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  youtubeUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByEmail: string;
  updatedBy?: string;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  imageUrl?: string | null;
  youtubeUrl?: string | null;
}

export interface UpdateArticleInput {
  title?: string;
  content?: string;
  imageUrl?: string | null;
  youtubeUrl?: string | null;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  count?: number;
}

export interface ApiErrorResponse {
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Usage
const result: ApiResponse<Article[]> = await fetchArticles();
if (result.success) {
  console.log(result.data); // TypeScript knows it's Article[]
}
```

---

## Best Practices

### 1. Authentication Management

```javascript
// Store token in localStorage or sessionStorage
const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

const clearAuthToken = () => {
  localStorage.removeItem('authToken');
};
```

### 2. API Client Wrapper

```javascript
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      handleApiError(data.error, response.status);
      throw new Error(data.error);
    }

    return data;
  }

  // Convenience methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(body) 
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(body) 
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Usage
const api = new ApiClient(API_BASE_URL);

const articles = await api.get('/news');
const newArticle = await api.post('/admin/news', { title, content });
await api.put(`/admin/news/${id}`, updates);
await api.delete(`/admin/news/${id}`);
```

### 3. Error Retry Logic

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}

// Usage
const articles = await withRetry(() => api.get('/news'));
```

### 4. Loading States

```javascript
const [state, setState] = useState({
  loading: false,
  error: null,
  data: null
});

const fetchData = async () => {
  setState({ loading: true, error: null, data: null });
  try {
    const result = await api.get('/news');
    setState({ loading: false, error: null, data: result });
  } catch (error) {
    setState({ loading: false, error: error.message, data: null });
  }
};
```

---

## Checklist for Frontend Team

- [ ] Setup Firebase SDK with correct config
- [ ] Implement authentication (login/logout)
- [ ] Create API client wrapper class
- [ ] Implement GET /news (public list)
- [ ] Implement POST /admin/news (create - admin only)
- [ ] Implement PUT /admin/news/:id (update - admin only)
- [ ] Implement DELETE /admin/news/:id (delete - admin only)
- [ ] Handle all error cases (401, 403, 404, etc.)
- [ ] Add loading states for all API calls
- [ ] Add retry logic for network failures
- [ ] Test with Postman first
- [ ] Test with real Firebase auth
- [ ] Test in production environment
- [ ] Monitor API rate limits
- [ ] Add error logging/monitoring

---

## Testing

### Unit Test Example (Jest)

```javascript
describe('ArticleApi', () => {
  it('should fetch articles', async () => {
    const result = await api.get('/news');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should create article with token', async () => {
    const token = 'fake-token';
    localStorage.setItem('authToken', token);
    
    const result = await api.post('/admin/news', {
      title: 'Test',
      content: 'Test content'
    });
    
    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
  });

  it('should reject without token', async () => {
    localStorage.removeItem('authToken');
    
    try {
      await api.post('/admin/news', { title: 'Test', content: 'Test' });
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('unauthorized');
    }
  });
});
```

---

## Support & Questions

For questions or issues:
1. Check API documentation first
2. Test with Postman/curl
3. Check Firebase Console for data
4. Check browser console for errors
5. Contact backend team

---

**API Documentation Complete! 🚀**

Frontend team can now integrate with confidence.
