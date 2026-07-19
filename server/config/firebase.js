import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance;
let authInstance;
let appInstance;

const hasFirebaseConfig = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

if (hasFirebaseConfig) {
  try {
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    appInstance = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });

    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    
    // Initialize Firestore settings for real-time sync
    dbInstance.settings({ ignoreUndefinedProperties: true });
    
    console.log("✓ Firebase Admin SDK initialized successfully");
  } catch (err) {
    console.error("✗ Failed to initialize Firebase Admin SDK:", err.message);
    console.log("🔄 Falling back to Local Mock Database & Auth...");
    initializeMock();
  }
} else {
  console.log("ℹ️ No Firebase credentials found in environment.");
  console.log("🔄 Starting server with Local In-Memory Database & Auth (Offline-First Dev Mode)...");
  initializeMock();
}

function initializeMock() {
  const collections = new Map();

  class MockDocumentRef {
    constructor(collectionName, docId) {
      this.collectionName = collectionName;
      this.id = docId || Math.random().toString(36).substring(7);
    }
    async get() {
      const coll = collections.get(this.collectionName);
      const data = coll ? coll.get(this.id) : null;
      return {
        exists: !!data,
        id: this.id,
        data: () => data
      };
    }
    async set(data, options) {
      if (!collections.has(this.collectionName)) {
        collections.set(this.collectionName, new Map());
      }
      const coll = collections.get(this.collectionName);
      if (options && options.merge) {
        const prev = coll.get(this.id) || {};
        coll.set(this.id, { ...prev, ...data });
      } else {
        coll.set(this.id, data);
      }
    }
    async update(data) {
      const coll = collections.get(this.collectionName);
      if (coll && coll.has(this.id)) {
        const prev = coll.get(this.id) || {};
        coll.set(this.id, { ...prev, ...data });
      } else {
        await this.set(data);
      }
    }
    async delete() {
      const coll = collections.get(this.collectionName);
      if (coll) coll.delete(this.id);
    }
  }

  class MockQuery {
    constructor(collectionName, filters = [], limitVal = null) {
      this.collectionName = collectionName;
      this.filters = filters;
      this.limitVal = limitVal;
    }
    where(field, op, value) {
      return new MockQuery(this.collectionName, [...this.filters, { field, op, value }], this.limitVal);
    }
    orderBy() {
      return this; // mock order by passes through
    }
    limit(num) {
      return new MockQuery(this.collectionName, this.filters, num);
    }
    async get() {
      const coll = collections.get(this.collectionName) || new Map();
      let results = [];
      for (const [id, data] of coll.entries()) {
        let match = true;
        for (const filter of this.filters) {
          if (filter.op === '==' && data[filter.field] !== filter.value) {
            match = false;
            break;
          }
        }
        if (match) {
          results.push({ id, data: () => data });
        }
      }
      if (this.limitVal !== null) {
        results = results.slice(0, this.limitVal);
      }
      return { docs: results };
    }
  }

  class MockCollection {
    constructor(name) {
      this.name = name;
    }
    doc(id) {
      return new MockDocumentRef(this.name, id);
    }
    where(field, op, value) {
      return new MockQuery(this.name).where(field, op, value);
    }
    orderBy() {
      return new MockQuery(this.name);
    }
    limit(num) {
      return new MockQuery(this.name).limit(num);
    }
    async get() {
      return new MockQuery(this.name).get();
    }
  }

  dbInstance = {
    collection: (name) => new MockCollection(name),
    settings: () => {}
  };

  authInstance = {
    createUser: async (data) => {
      const uid = Math.random().toString(36).substring(7);
      // Automatically save mock profile settings
      const coll = dbInstance.collection('users');
      await coll.doc(uid).set({
        id: uid,
        name: data.displayName,
        email: data.email,
        role: 'Farmer',
        createdAt: new Date().toISOString()
      });
      return { uid, email: data.email, displayName: data.displayName };
    },
    setCustomUserClaims: async () => {},
    verifyIdToken: async (token) => {
      // Mock validation
      if (token === 'invalid-token') {
        throw new Error('Invalid token');
      }
      return { uid: 'mock-user-id', email: 'mock-farmer@agrisense.com', role: 'Farmer' };
    }
  };
}

export const db = dbInstance;
export const auth = authInstance;
export default appInstance;
