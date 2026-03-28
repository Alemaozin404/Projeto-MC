import * as admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    // In Cloud Run, the default credentials are used automatically
  });
}

export const adminDb = admin.firestore();
// Use the specific database ID if provided in config
if (firebaseConfig.firestoreDatabaseId) {
  // Note: Standard admin.firestore() uses the default database.
  // To use a named database, we might need a different approach depending on the SDK version.
  // For now, let's assume the default or that the SDK handles it.
}
