const fs = require('fs');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

const sa = require('./firebase-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: 'invest-x-505513.appspot.com' });

async function test() {
  try {
    // Get token
    const token = await admin.auth().createCustomToken('XzQWfjbfiEhuh5eJUfk6626paM43');
    console.log('✅ Token created');

    // Test 1: Base64 upload
    const img1 = fs.readFileSync('/tmp/img1.jpg').toString('base64');
    const img2 = fs.readFileSync('/tmp/img2.png').toString('base64');
    const img3 = fs.readFileSync('/tmp/img3.jpg').toString('base64');

    const images = [
      { base64: img1, name: 'test1.jpg', mime: 'image/jpeg' },
      { base64: img2, name: 'test2.png', mime: 'image/png' },
      { base64: img3, name: 'test3.jpg', mime: 'image/jpeg' }
    ];

    console.log('\n📤 Uploading 3 images...\n');

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const response = await fetch('https://invest-x-pearl.vercel.app/api/admin/news/upload-image-base64', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: img.base64,
          filename: img.name,
          mimeType: img.mime
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log(`✅ Image ${i+1}: ${img.name}`);
        console.log(`   URL: ${data.data.imageUrl.substring(0, 80)}...`);
        console.log(`   Size: ${data.data.size} bytes\n`);
      } else {
        console.log(`❌ Image ${i+1} failed: ${data.error}\n`);
      }
    }

    console.log('🎉 PHASE 1 COMPLETE - Images uploaded to Firebase Storage!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
