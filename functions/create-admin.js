const admin = require('firebase-admin');

admin.initializeApp();

async function createAdmin() {
  try {
    // 1. Create user
    const user = await admin.auth().createUser({
      email: 'admin@invest-x.com',
      password: 'Invest123!Admin',
      displayName: 'Admin'
    });
    console.log('✓ User created:', user.uid);

    // 2. Set admin claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('✓ Admin claim set');

    console.log('\n📋 Login info:');
    console.log('Email: admin@invest-x.com');
    console.log('Password: Invest123!Admin');
    console.log('\n⚠️  Cần refresh browser sau khi login để nhận quyền admin');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit();
}

createAdmin();
