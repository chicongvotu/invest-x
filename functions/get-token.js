#!/usr/bin/env node

/**
 * Get ID Token cho testing
 * Hướng dẫn: Login qua browser Firebase SDK
 *
 * Usage:
 *   node get-token.js
 */

console.log(`
╔════════════════════════════════════════════════════════════╗
║          Get Admin Token for API Testing                  ║
╚════════════════════════════════════════════════════════════╝

📧 Admin Email:    admin@invest-x.com
🔐 Admin Password: Invest123!

✅ 3 WAYS TO GET TOKEN:

METHOD 1: Browser Console (Recommended)
────────────────────────────────────────
1. Go to: https://invest-x-pearl.vercel.app/
2. Open F12 > Console
3. Paste:
   firebase.auth().signInWithEmailAndPassword('admin@invest-x.com', 'Invest123!')
     .then(async u => {
       const t = await u.user.getIdToken();
       console.log('Token:', t);
       console.log('Copy token above and use in curl/postman');
     });

4. Copy the token and use below

METHOD 2: Curl Login (Terminal)
────────────────────────────────
Run this command to get token:

  curl -s -X POST \\
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDKR...' \\
    -H 'Content-Type: application/json' \\
    -d '{
      "email": "admin@invest-x.com",
      "password": "Invest123!",
      "returnSecureToken": true
    }' | jq '.idToken'

METHOD 3: Firebase Emulator (Local Dev)
────────────────────────────────────────
Run:  firebase emulators:start --only auth

═══════════════════════════════════════════════════════════════

📋 AFTER GETTING TOKEN:

Test with curl:

  TOKEN="<PASTE_YOUR_TOKEN_HERE>"

  curl -X POST https://invest-x-pearl.vercel.app/api/admin/news \\
    -H "Authorization: Bearer \$TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{
      "title": "Test Article",
      "content": "Test content",
      "imageUrl": "https://via.placeholder.com/400",
      "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ"
    }'

═══════════════════════════════════════════════════════════════
`);

console.log('👉 Choose METHOD 1 (Browser Console) — it\\'s easiest!');
