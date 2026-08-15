const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const busboy = require('busboy');

// Initialize Firebase Admin SDK
admin.initializeApp({
  storageBucket: 'invest-x-505513.firebasestorage.app'
});
const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

const app = express();

// Middleware
app.use(cors({ origin: '*' }));

// POST /admin/news/upload-image - Upload image using busboy
app.post('/admin/news/upload-image', async (req, res) => {
  try {
    console.log('[UPLOAD] Start');
    console.log('[UPLOAD] Content-Type:', req.headers['content-type']);

    // Step 1: Verify auth
    const authResult = await verifyAuth(req);
    if (authResult.error) {
      return res.status(401).json({ error: authResult.error });
    }
    console.log('[UPLOAD] Auth OK:', authResult.email);

    // Step 2: Check if admin
    const isAdminUser = await isAdmin(authResult.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'User is not admin' });
    }
    console.log('[UPLOAD] Admin OK');

    // Step 3: Parse multipart with busboy
    const bb = busboy({ headers: req.headers });
    console.log('[UPLOAD] Busboy created');

    let fileBuffer = null;
    let originalName = null;
    let mimeType = null;
    let responsesSent = false;

    bb.on('field', (fieldname, value) => {
      console.log('[UPLOAD] Field:', fieldname);
    });

    bb.on('file', (fieldname, file, info) => {
      console.log('[UPLOAD] File event:', fieldname, info);
      if (fieldname !== 'image') {
        console.log('[UPLOAD] Skip file:', fieldname);
        file.resume();
        return;
      }

      mimeType = info.mimeType;
      console.log('[UPLOAD] MIME:', mimeType);

      if (!mimeType.startsWith('image/')) {
        file.resume();
        return;
      }

      const chunks = [];
      file.on('data', (chunk) => {
        console.log('[UPLOAD] Chunk:', chunk.length);
        chunks.push(chunk);
      });
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        originalName = info.filename;
        console.log('[UPLOAD] File end, size:', fileBuffer.length);
      });
      file.on('error', (err) => {
        console.error('[UPLOAD] File error:', err.message);
      });
    });

    bb.on('close', async () => {
      console.log('[UPLOAD] Busboy close');

      if (responsesSent) return;

      if (!fileBuffer) {
        responsesSent = true;
        return res.status(400).json({ error: 'No image file provided' });
      }

      if (!mimeType || !mimeType.startsWith('image/')) {
        responsesSent = true;
        return res.status(400).json({ error: 'Only image files allowed' });
      }

      try {
        console.log('[UPLOAD] Uploading to Storage:', originalName);
        const timestamp = Date.now();
        const filename = `articles/${timestamp}-${originalName}`;
        const file = bucket.file(filename);

        await file.save(fileBuffer, {
          metadata: {
            contentType: mimeType,
            metadata: {
              uploadedBy: authResult.email,
              uploadedAt: new Date().toISOString()
            }
          }
        });

        console.log('[UPLOAD] Upload success');
        const publicUrl = `https://storage.googleapis.com/invest-x-505513.firebasestorage.app/${filename}`;

        responsesSent = true;
        res.json({
          success: true,
          data: {
            imageUrl: publicUrl,
            filename: originalName,
            size: fileBuffer.length
          }
        });
      } catch (uploadError) {
        console.error('[UPLOAD] Upload error:', uploadError.message);
        responsesSent = true;
        res.status(500).json({ error: uploadError.message });
      }
    });

    bb.on('error', (err) => {
      console.error('[UPLOAD] Busboy error:', err.message);
      if (!responsesSent) {
        responsesSent = true;
        res.status(400).json({ error: err.message });
      }
    });

    console.log('[UPLOAD] Piping request to busboy');
    req.pipe(bb);
  } catch (error) {
    console.error('[UPLOAD] Try-catch error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/news/upload-image-base64 - Upload image as base64 (alternative)
app.post('/admin/news/upload-image-base64', async (req, res) => {
  try {
    console.log('[BASE64] Start');

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

    // Step 3: Get base64 from body
    const { imageBase64, filename, mimeType } = req.body;

    if (!imageBase64 || !filename) {
      return res.status(400).json({ error: 'imageBase64 and filename required' });
    }

    if (!mimeType || !mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid image MIME type' });
    }

    // Step 4: Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, 'base64');
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (buffer.length > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }

    console.log('[BASE64] Buffer size:', buffer.length);

    // Step 5: Upload to Firebase Storage
    const timestamp = Date.now();
    const storagePath = `articles/${timestamp}-${filename}`;
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          uploadedBy: authResult.email,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    console.log('[BASE64] Upload success');

    // Step 6: Generate public URL
    const publicUrl = `https://storage.googleapis.com/invest-x-505513.firebasestorage.app/${storagePath}`;

    res.json({
      success: true,
      data: {
        imageUrl: publicUrl,
        filename: filename,
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('[BASE64] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Now apply body parsers for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Error handling middleware for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Export Cloud Function (gen2)
exports.api = onRequest({
  region: 'asia-southeast1',
  minInstances: 0,
  memory: '512MiB',
  cors: false
}, app);
