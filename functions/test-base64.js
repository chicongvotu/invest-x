const fs = require('fs');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

const sa = require('./firebase-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });

async function test() {
  try {
    // Get token
    const token = await admin.auth().createCustomToken('XzQWfjbfiEhuh5eJUfk6626paM43');
    console.log('✅ Token created');

    // Read image as base64
    const imageBuffer = fs.readFileSync('/tmp/img1.jpg');
    const base64 = imageBuffer.toString('base64');
    console.log('✅ Image read:', base64.length, 'chars');

    // Upload
    const response = await fetch('https://invest-x-pearl.vercel.app/api/admin/news/upload-image-base64', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageBase64: base64,
        filename: 'test-img1.jpg',
        mimeType: 'image/jpeg'
      })
    });

    const data = await response.json();
    console.log('\n✅ Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success && data.data.imageUrl) {
      console.log('\n🎉 SUCCESS! Image URL:', data.data.imageUrl);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
