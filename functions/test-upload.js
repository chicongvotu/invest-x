const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const admin = require('firebase-admin');

const sa = require('./firebase-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });

async function test() {
  try {
    // Get token
    const token = await admin.auth().createCustomToken('XzQWfjbfiEhuh5eJUfk6626paM43');
    console.log('✅ Token created');

    // Create FormData
    const form = new FormData();
    form.append('image', fs.createReadStream('/tmp/img1.jpg'), 'img1.jpg');

    console.log('📤 Uploading...');
    const response = await fetch('https://invest-x-pearl.vercel.app/api/admin/news/upload-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
