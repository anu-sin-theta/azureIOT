const admin = require('firebase-admin');

// This line requires the secret key file
const serviceAccount = require('./gottlich-sa.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// IMPORTANT: Change this to the email of your main admin user
const adminEmail = 'akhil@gottlich.in';

async function setInitialAdmin() {
  try {
    const user = await admin.auth().getUserByEmail(adminEmail);
    // This is the magic line that sets the claim using the Admin SDK
    await admin.auth().setCustomUserClaims(user.uid, { isAdmin: true });
    console.log(`Success! ${adminEmail} has been made an admin.`);
  } catch (error) {
    console.error('Error setting admin claim:', error);
  }
  process.exit();
}

setInitialAdmin();
