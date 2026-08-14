const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'XzQWfjbfiEhuh5eJUfk6626paM43';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('✅ Custom claim "admin: true" set successfully!');
    console.log('User UID:', uid);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
