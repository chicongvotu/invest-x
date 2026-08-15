#!/usr/bin/env node

/**
 * Lấy admin ID token trực tiếp
 * Usage: node get-admin-token.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

async function getToken() {
  try {
    const uid = 'XzQWfjbfiEhuh5eJUfk6626paM43';

    // Create custom token
    const customToken = await auth.createCustomToken(uid);
    console.log('✅ Custom Token (valid 1 hour):');
    console.log(customToken);
    console.log('\n');

    // Get user info
    const user = await auth.getUser(uid);
    console.log('👤 Admin User:');
    console.log('  Email:', user.email);
    console.log('  UID:', user.uid);
    console.log('  Is Admin:', user.customClaims?.admin === true ? 'YES ✅' : 'NO ❌');
    console.log('\n');

    // Show how to exchange
    console.log('📋 To get ID token from custom token:');
    console.log('');
    console.log('Option 1: Use Firebase SDK (browser or Node.js)');
    console.log('');
    console.log('  firebase.auth().signInWithCustomToken(customToken)');
    console.log('    .then(async u => {');
    console.log('      const idToken = await u.user.getIdToken();');
    console.log('      console.log("ID Token:", idToken);');
    console.log('    });');
    console.log('');
    console.log('Option 2: Use curl with Firebase REST API');
    console.log('');
    console.log('  curl -X POST \\');
    console.log('    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyDX-56B0mIqTKZdWBZx7rI0vkrGRKJNrBg" \\');
    console.log(`    -d '{"token":"${customToken}","returnSecureToken":true}'`);
    console.log('');
    console.log('🚀 Custom token ready to exchange!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'app/no-app') {
      console.error('Make sure firebase-key.json exists in this directory');
    }
    process.exit(1);
  }
}

getToken();
