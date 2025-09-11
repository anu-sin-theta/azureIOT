const admin = require('firebase-admin');
const serviceAccount = require('./messSA.json'); // Use the MESS service account

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const emailToVerify = 'akhil@gottlich.in';

async function verify() {
  try {
    const user = await admin.auth().getUserByEmail(emailToVerify);
    console.log(`Found user: ${user.email}`);
    console.log('Custom Claims: ', user.customClaims);
    if (user.customClaims && user.customClaims.isAdmin === true) {
      console.log('\n✅ Verification Successful: User is an admin.');
    } else {
      console.log('\n❌ Verification FAILED: User is NOT an admin.');
    }
  } catch (error) {
    console.error('Error verifying admin:', error.message);
  }
  process.exit();
}

verify();
