const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

admin.auth().listUsers(1000)
  .then(result => {
    console.log('All users:');
    result.users.forEach(user => {
      console.log(`Email: ${user.email} | UID: ${user.uid}`);
    });
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
