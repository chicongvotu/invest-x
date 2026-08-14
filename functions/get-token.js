#!/usr/bin/env node

/**
 * Script để lấy ID Token cho admin user
 * Dùng cho testing
 *
 * Usage:
 *   node get-token.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

async function getAdminToken() {
  try {
    const uid = 'XzQWfjbfiEhuh5eJUfk6626paM43'; // Admin UID

    // Create custom token
    console.log('🔑 Creating custom token for admin user...');
    const customToken = await auth.createCustomToken(uid);
    console.log('✅ Custom token created (valid for 1 hour):\n');
    console.log(customToken);
    console.log('\n');

    // Get user info
    const userRecord = await auth.getUser(uid);
    console.log('📧 User:', userRecord.email);
    console.log('👤 Admin:', userRecord.customClaims?.admin === true ? 'Yes' : 'No');

    console.log('\n📋 How to use:');
    console.log('1. Copy the token above');
    console.log('2. Use in curl:');
    console.log(`   curl -X POST https://invest-x-pearl.vercel.app/api/admin/news \\`);
    console.log(`     -H "Authorization: Bearer <TOKEN>" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"title":"...","content":"..."}'`);
    console.log('\n3. Or in JavaScript:');
    console.log('   const token = "<TOKEN>";');
    console.log('   fetch("/api/admin/news", {');
    console.log('     method: "POST",');
    console.log('     headers: { "Authorization": "Bearer " + token }');
    console.log('   })');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFix: Make sure firebase-key.json exists in functions/ folder');
    process.exit(1);
  }
}

getAdminToken();
