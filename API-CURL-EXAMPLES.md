# API Integration Guide — Curl Examples

**Base URL:** `https://invest-x-pearl.vercel.app/api`  
**Firestore Database:** `invest-x-505513`  
**Admin Email:** `admin@invest-x.com`  
**Admin Password:** `Invest123!`

---

## 📌 Quick Start

### 1️⃣ Get All News (Public)

```bash
curl https://invest-x-pearl.vercel.app/api/news
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "article-abc123",
      "title": "Breaking News",
      "content": "Article content...",
      "imageUrl": "https://...",
      "youtubeUrl": "https://youtu.be/...",
      "createdAt": "2026-08-14T10:00:00Z",
      "updatedAt": "2026-08-14T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 2️⃣ Create Article (Admin Only)

**Step 1: Get ID Token**

```bash
# Login admin user
curl -X POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDX-56B0mIqTKZdWBZx7rI0vkrGRKJNrBg \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@invest-x.com",
    "password": "Invest123!",
    "returnSecureToken": true
  }'
```

**Response:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZC...",
  "email": "admin@invest-x.com",
  ...
}
```

**Step 2: Copy `idToken` from response**

**Step 3: Create Article**

```bash
# Replace <ID_TOKEN> with token from Step 1
curl -X POST https://invest-x-pearl.vercel.app/api/admin/news \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tin tức mới - August 14, 2026",
    "content": "Nội dung chi tiết của bài viết...",
    "imageUrl": "https://via.placeholder.com/400x300",
    "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "auto-generated-id",
    "title": "Tin tức mới - August 14, 2026",
    "content": "Nội dung chi tiết của bài viết...",
    "imageUrl": "https://via.placeholder.com/400x300",
    "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ",
    "createdAt": "2026-08-14T12:34:56.000Z"
  }
}
```

---

### 3️⃣ Update Article

```bash
# Replace <ID_TOKEN> and <ARTICLE_ID>
curl -X PUT https://invest-x-pearl.vercel.app/api/admin/news/<ARTICLE_ID> \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "Updated content..."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "<ARTICLE_ID>",
    "title": "Updated Title",
    "content": "Updated content...",
    "updatedAt": "2026-08-14T13:00:00.000Z"
  }
}
```

---

### 4️⃣ Delete Article

```bash
# Replace <ID_TOKEN> and <ARTICLE_ID>
curl -X DELETE https://invest-x-pearl.vercel.app/api/admin/news/<ARTICLE_ID> \
  -H "Authorization: Bearer <ID_TOKEN>"
```

**Response:**
```json
{
  "success": true,
  "message": "Article <ARTICLE_ID> deleted"
}
```

---

## 🔑 Authentication

All admin routes require Bearer token in Authorization header:

```bash
-H "Authorization: Bearer <ID_TOKEN>"
```

**How to get ID Token:**

1. **Via Firebase Console (Email/Password):**
```bash
curl -X POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDX-56B0mIqTKZdWBZx7rI0vkrGRKJNrBg \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@invest-x.com",
    "password": "Invest123!",
    "returnSecureToken": true
  }'
```

2. **Via Firebase JS SDK (Browser):**
```javascript
const user = await firebase.auth().signInWithEmailAndPassword(email, password);
const token = await user.user.getIdToken();
console.log('ID Token:', token);
```

3. **Via Google OAuth (Frontend):**
```javascript
const user = await firebase.auth().signInWithPopup(provider);
const token = await user.user.getIdToken();
```

---

## 📊 Error Responses

### ❌ Unauthorized (No token)
```json
{
  "error": "Missing or invalid authorization header"
}
```
**Status:** 401

---

### ❌ Forbidden (Not admin)
```json
{
  "error": "User is not admin"
}
```
**Status:** 403

---

### ❌ Bad Request (Missing fields)
```json
{
  "error": "Title and content are required"
}
```
**Status:** 400

---

### ❌ Not Found (Article doesn't exist)
```json
{
  "error": "Article not found"
}
```
**Status:** 404

---

## 🔄 Full Integration Example (Bash Script)

```bash
#!/bin/bash

API_URL="https://invest-x-pearl.vercel.app/api"
ADMIN_EMAIL="admin@invest-x.com"
ADMIN_PASSWORD="Invest123!"
API_KEY="AIzaSyDX-56B0mIqTKZdWBZx7rI0vkrGRKJNrBg"

# 1. Login and get token
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$API_KEY \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"returnSecureToken\":true}")

ID_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.idToken')
echo "✅ Token: ${ID_TOKEN:0:50}..."

# 2. Create article
echo "📝 Creating article..."
CREATE_RESPONSE=$(curl -s -X POST $API_URL/admin/news \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Article",
    "content": "Test content",
    "imageUrl": "https://example.com/image.jpg",
    "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ"
  }')

ARTICLE_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')
echo "✅ Article created: $ARTICLE_ID"

# 3. Get all articles
echo "📖 Fetching all articles..."
curl -s $API_URL/news | jq '.'

# 4. Update article
echo "✏️ Updating article..."
curl -s -X PUT $API_URL/admin/news/$ARTICLE_ID \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}' | jq '.'

# 5. Delete article
echo "🗑️ Deleting article..."
curl -s -X DELETE $API_URL/admin/news/$ARTICLE_ID \
  -H "Authorization: Bearer $ID_TOKEN" | jq '.'

echo "✨ Done!"
```

**Run:**
```bash
bash integration-test.sh
```

---

## 📋 API Response Format

All responses follow this structure:

### ✅ Success Response
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "...",
    ...
  }
}
```

### ❌ Error Response
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## 🎯 Environment Variables (Best Practice)

```bash
# .env
API_URL="https://invest-x-pearl.vercel.app/api"
ADMIN_EMAIL="admin@invest-x.com"
ADMIN_PASSWORD="Invest123!"
FIREBASE_API_KEY="AIzaSyDX-56B0mIqTKZdWBZx7rI0vkrGRKJNrBg"
FIREBASE_PROJECT_ID="invest-x-505513"
```

**Usage in script:**
```bash
source .env
curl -X POST $API_URL/admin/news \
  -H "Authorization: Bearer $ID_TOKEN" \
  ...
```

---

## 📚 Firestore Data Structure

```
Collection: articles
├── Document: auto-generated-id
│   ├── title: string
│   ├── content: string
│   ├── imageUrl: string (nullable)
│   ├── youtubeUrl: string (nullable)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── createdBy: string (user UID)
│   └── createdByEmail: string
```

---

## 🚀 Next Steps

1. **Test with curl** (above examples)
2. **Import to Postman** (see API-SWAGGER.yaml)
3. **Frontend integration** (fetch API from JavaScript)
4. **CI/CD automation** (bash scripts or GitHub Actions)

---

**API ready for production! 🎉**
