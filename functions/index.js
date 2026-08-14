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

// Verify ID token from Authorization header
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
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

// POST /auth/token - Get custom token for testing (development only)
// Use Firebase SDK to exchange this for ID token
app.post('/auth/token', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        error: 'UID is required',
        message: 'For admin user: XzQWfjbfiEhuh5eJUfk6626paM43'
      });
    }

    // Verify user exists
    const userRecord = await auth.getUser(uid);
    const isAdminUser = userRecord.customClaims?.admin === true;

    // Create custom token
    const customToken = await auth.createCustomToken(uid);

    res.json({
      success: true,
      data: {
        customToken,
        uid,
        email: userRecord.email,
        isAdmin: isAdminUser,
        message: 'Exchange this customToken for idToken using Firebase SDK'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
