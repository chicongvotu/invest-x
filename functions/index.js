const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================
// Helper Functions
// ============================================

// Decode JWT without verification (for custom tokens in dev)
function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return decoded;
  } catch (e) {
    return null;
  }
}

// Verify ID token from Authorization header
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  try {
    // Try ID token first
    const decodedToken = await auth.verifyIdToken(token);
    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch (idTokenError) {
    // Fallback: try custom token (for dev/testing)
    const decoded = decodeJwt(token);
    if (decoded && decoded.uid) {
      // Custom token - fetch user info to confirm it's valid
      try {
        const userRecord = await auth.getUser(decoded.uid);
        return { uid: userRecord.uid, email: userRecord.email };
      } catch (userError) {
        return { error: 'Invalid token - user not found' };
      }
    }
    return { error: 'Invalid or expired token' };
  }
}

// Check if user is admin
async function isAdmin(uid) {
  try {
    const userRecord = await auth.getUser(uid);
    return userRecord.customClaims?.admin === true;
  } catch (error) {
    return false;
  }
}

// ============================================
// Routes
// ============================================

// POST /auth/login - Login and get token (for testing)
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        example: {
          email: 'admin@invest-x.com',
          password: 'Invest123!'
        }
      });
    }

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    const isAdminUser = userRecord.customClaims?.admin === true;

    // Note: Password verification is handled by Firebase SDK
    // This endpoint only checks if user exists and has admin claim
    // Real token exchange happens in frontend via Firebase SDK

    res.json({
      success: true,
      data: {
        email: userRecord.email,
        uid: userRecord.uid,
        isAdmin: isAdminUser,
        message: 'Use Firebase SDK in frontend to get idToken after login'
      }
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.status(400).json({ error: error.message });
  }
});

// POST /auth/exchange-custom-token - Exchange custom token for ID token
app.post('/auth/exchange-custom-token', async (req, res) => {
  try {
    const { customToken } = req.body;
    if (!customToken) {
      return res.status(400).json({ error: 'customToken is required' });
    }

    const apiKey = 'AIzaSyDX-56B0mIqTKZdWBZx7rI0vkrGRKJNrBg';
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true
        })
      }
    );

    const data = await response.json();
    if (data.idToken) {
      res.json({ success: true, idToken: data.idToken });
    } else {
      res.status(400).json({ error: data.error?.message || 'Failed to exchange token', details: data.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /news - Public: Get all articles
app.get('/news', async (req, res) => {
  try {
    const snapshot = await db.collection('articles').get();
    const articles = [];

    snapshot.forEach(doc => {
      articles.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      data: articles,
      count: articles.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/news - Admin: Create new article
app.post('/admin/news', async (req, res) => {
  try {
    // Step 1: Verify auth
    const authResult = await verifyAuth(req);
    if (authResult.error) {
      return res.status(401).json({ error: authResult.error });
    }

    // Step 2: Check if admin
    const isAdminUser = await isAdmin(authResult.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'User is not admin' });
    }

    // Step 3: Validate request body
    const { title, content, imageUrl, youtubeUrl } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Step 4: Create article in Firestore
    const docRef = await db.collection('articles').add({
      title,
      content,
      imageUrl: imageUrl || null,
      youtubeUrl: youtubeUrl || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: authResult.uid,
      createdByEmail: authResult.email
    });

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        title,
        content,
        imageUrl,
        youtubeUrl,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /admin/news/:id - Admin: Update article
app.put('/admin/news/:id', async (req, res) => {
  try {
    // Step 1: Verify auth
    const authResult = await verifyAuth(req);
    if (authResult.error) {
      return res.status(401).json({ error: authResult.error });
    }

    // Step 2: Check if admin
    const isAdminUser = await isAdmin(authResult.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'User is not admin' });
    }

    // Step 3: Get article ID from URL
    const { id } = req.params;
    const { title, content, imageUrl, youtubeUrl } = req.body;

    // Step 4: Check if article exists
    const docRef = db.collection('articles').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Step 5: Update article
    const oldData = doc.data();
    await docRef.update({
      title: title || oldData.title,
      content: content || oldData.content,
      imageUrl: imageUrl !== undefined ? imageUrl : oldData.imageUrl,
      youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : oldData.youtubeUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: authResult.uid
    });

    res.json({
      success: true,
      data: {
        id,
        title: title || oldData.title,
        content: content || oldData.content,
        imageUrl: imageUrl !== undefined ? imageUrl : oldData.imageUrl,
        youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : oldData.youtubeUrl,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/news/:id - Admin: Delete article
app.delete('/admin/news/:id', async (req, res) => {
  try {
    // Step 1: Verify auth
    const authResult = await verifyAuth(req);
    if (authResult.error) {
      return res.status(401).json({ error: authResult.error });
    }

    // Step 2: Check if admin
    const isAdminUser = await isAdmin(authResult.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'User is not admin' });
    }

    // Step 3: Get article ID
    const { id } = req.params;

    // Step 4: Check if article exists
    const docRef = db.collection('articles').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Step 5: Delete article
    await docRef.delete();

    res.json({
      success: true,
      message: `Article ${id} deleted`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export Cloud Function (gen2)
exports.api = onRequest({
  region: 'asia-southeast1',
  minInstances: 0,
  memory: '512MiB',
  cors: false
}, app);
