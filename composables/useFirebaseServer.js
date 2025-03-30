import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Check if the environment variable is set
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not defined.");
}

let firebaseServerAccounts;
try {
  // Check if it's a file path (local environment)
  if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    firebaseServerAccounts = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  } else {
    // Assume it's a JSON string (Netlify environment)
    firebaseServerAccounts = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
} catch (error) {
  throw new Error("Failed to load or parse GOOGLE_APPLICATION_CREDENTIALS. Ensure it is valid JSON or a valid file path.");
}

let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(firebaseServerAccounts)
  });
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export default function useFirebaseServer() {
  return {
    db,
    getAuth
  };
}
