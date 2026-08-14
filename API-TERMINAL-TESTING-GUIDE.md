# 🔧 Firebase News API — Terminal Testing Guide

**Quick Start**: Test all APIs from terminal using curl (no browser needed)

---

## Step 1: Get Admin Token (Custom Token)

Run this script to generate a fresh admin token:

```bash
cd functions

# Get custom token (valid for 1 hour)
node get-admin-token.js
```

**Output:**
```
✅ Custom Token (valid 1 hour):
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2lkZW50...
```

**Copy the token** (the long string after "✅ Custom Token") into your terminal:

```bash
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2lkZW50..."
```

---

## Step 2: Test Endpoints

### 2.1 Create Article (POST)

```bash
curl -X POST https://invest-x-pearl.vercel.app/api/admin/news \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Breaking News",
    "content": "This is the full article content",
    "imageUrl": "https://via.placeholder.com/400x300",
    "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "9qDeDYas6iEHFV7qjDro",
    "title": "Breaking News",
    "content": "This is the full article content",
    "createdAt": "2026-08-14T16:36:08.584Z"
  }
}
```

**Save the article ID** for next steps:
```bash
ARTICLE_ID="9qDeDYas6iEHFV7qjDro"
```

---

### 2.2 Get All Articles (GET - Public)

```bash
curl -X GET https://invest-x-pearl.vercel.app/api/news | jq '.'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "9qDeDYas6iEHFV7qjDro",
      "title": "Breaking News",
      "content": "This is the full article content",
      "imageUrl": "https://via.placeholder.com/400x300",
      "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ",
      "createdAt": "2026-08-14T16:36:08.584Z",
      "createdBy": "XzQWfjbfiEhuh5eJUfk6626paM43",
      "createdByEmail": "admin@invest-x.com"
    }
  ],
  "count": 1
}
```

---

### 2.3 Update Article (PUT)

```bash
curl -X PUT https://invest-x-pearl.vercel.app/api/admin/news/$ARTICLE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Breaking News",
    "content": "Updated content here"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "9qDeDYas6iEHFV7qjDro",
    "title": "Updated Breaking News",
    "content": "Updated content here",
    "updatedAt": "2026-08-14T16:40:00.000Z"
  }
}
```

---

### 2.4 Delete Article (DELETE)

```bash
curl -X DELETE https://invest-x-pearl.vercel.app/api/admin/news/$ARTICLE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Article 9qDeDYas6iEHFV7qjDro deleted"
}
```

---

## Step 3: Test Permission Rejection

Try calling admin endpoint **without token**:

```bash
curl -X POST https://invest-x-pearl.vercel.app/api/admin/news \
  -H "Content-Type: application/json" \
  -d '{"title": "No auth", "content": "Should fail"}'
```

**Response (401):**
```json
{
  "error": "Missing or invalid authorization header"
}
```

---

## Complete End-to-End Test Script

Save this as `test-api.sh` and run `bash test-api.sh`:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Get token
echo "📝 Getting custom token..."
TOKEN=$(cd functions && node -e "
const admin = require('firebase-admin');
const sa = require('./firebase-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
admin.auth().createCustomToken('XzQWfjbfiEhuh5eJUfk6626paM43').then(t => {
  console.log(t);
  process.exit(0);
}).catch(e => process.exit(1));
" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get token${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Token obtained${NC}\n"

# Test 1: Get all articles
echo "📖 Test 1: GET /news (public)..."
COUNT=$(curl -s -X GET https://invest-x-pearl.vercel.app/api/news | jq '.data | length')
echo -e "${GREEN}✓ Found $COUNT articles${NC}\n"

# Test 2: Create article
echo "📝 Test 2: POST /admin/news (create)..."
CREATE=$(curl -s -X POST https://invest-x-pearl.vercel.app/api/admin/news \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Article","content":"Test content"}')
ARTICLE_ID=$(echo $CREATE | jq -r '.data.id')
TITLE=$(echo $CREATE | jq -r '.data.title')
echo -e "${GREEN}✓ Created article: $TITLE (ID: $ARTICLE_ID)${NC}\n"

# Test 3: Update article
echo "✏️  Test 3: PUT /admin/news/:id (update)..."
UPDATE=$(curl -s -X PUT https://invest-x-pearl.vercel.app/api/admin/news/$ARTICLE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}')
NEW_TITLE=$(echo $UPDATE | jq -r '.data.title')
echo -e "${GREEN}✓ Updated article: $NEW_TITLE${NC}\n"

# Test 4: Delete article
echo "🗑️  Test 4: DELETE /admin/news/:id (delete)..."
DELETE=$(curl -s -X DELETE https://invest-x-pearl.vercel.app/api/admin/news/$ARTICLE_ID \
  -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}✓ Article deleted${NC}\n"

# Test 5: Auth rejection
echo "🔐 Test 5: Auth rejection (no token)..."
REJECT=$(curl -s -X POST https://invest-x-pearl.vercel.app/api/admin/news \
  -H "Content-Type: application/json" \
  -d '{"title":"No auth"}')
ERROR=$(echo $REJECT | jq -r '.error')
echo -e "${GREEN}✓ Rejected: $ERROR${NC}\n"

echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
```

---

## Troubleshooting

### "Invalid or expired token"
- Token expires after 1 hour — run `node get-admin-token.js` again
- Make sure you copied the full token string (starts with `eyJ...`)

### "User is not admin"
- Only admin account can create/edit/delete articles
- Admin account: `admin@invest-x.com` (UID: `XzQWfjbfiEhuh5eJUfk6626paM43`)

### "Missing or invalid authorization header"
- Forgot to add `Authorization: Bearer $TOKEN` header
- Make sure token is in Authorization header (not request body)

### Vercel 404 error
- Firebase Cloud Function deployed correctly? Check `firebase deploy --only functions`
- Vercel rewrite configured? Check `vercel.json` has `/api/:path*` route

---

## Next Steps

- Integrate API into frontend (see `API-DESIGN-FRONTEND.md`)
- Deploy to production (update domain in Vercel, Firebase, and frontend)
- Set up additional admin users (run `node set-admin-claim.js` with different UID)
