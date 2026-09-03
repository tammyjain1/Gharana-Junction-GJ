/* ==========================================================================
   FIREBASE CONFIG
   -------------------------------------------------------------------------
   1. Go to https://console.firebase.google.com → Add project (free).
   2. Inside the project: Build → Firestore Database → Create database
      (start in "production mode", any region close to India, e.g. asia-south1).
   3. Build → Authentication → Get started → Sign-in method → enable
      "Email/Password".
   4. Authentication → Users → Add user → this is your OWNER login
      (email + password you choose, e.g. owner@gharanajunction.com).
   5. Project settings (gear icon) → General → scroll to "Your apps" →
      click the </> (web) icon → register app → copy the firebaseConfig
      object it gives you and paste the values below.
   6. Firestore → Rules tab → paste the rules from README.md → Publish.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Business settings — edit freely
const BUSINESS_NAME = "Gharana Junction";
const WHATSAPP_NUMBER = "919132622222"; // country code + number, no + or spaces
