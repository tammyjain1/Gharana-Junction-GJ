# Gharana Junction — Digital Menu

Two pages, one project:

- `index.html` — **Customer menu** (public link, no login). Browse by category, search, add to cart, place order → opens WhatsApp with the order pre-filled.
- `owner.html` — **Owner panel** (private link, login required). Add/edit/delete items and categories, toggle in-stock / out-of-stock.

Both pages read live data from Firebase, so anything the owner changes shows up on the customer's phone within a second — no app, no refresh needed.

---

## 1. Why Firebase is needed

GitHub Pages only serves static files — it cannot store data. Firebase (from Google) gives you a free real-time database and login system that works directly from these HTML/JS files, no server to run.

**Free tier is enough** for a single restaurant menu — you will not be charged.

## 2. Create your Firebase project (~10 minutes)

1. Go to **console.firebase.google.com** → **Add project** → name it (e.g. `gharana-junction`) → finish the wizard.
2. In the left menu: **Build → Firestore Database → Create database**. Choose **Start in production mode**, pick a region close to India (e.g. `asia-south1`), click **Enable**.
3. In the left menu: **Build → Authentication → Get started**. Under **Sign-in method**, enable **Email/Password**.
4. Still in Authentication, go to the **Users** tab → **Add user**. This is your **owner login** — enter any email and password you'll remember (doesn't need to be a real inbox), e.g. `owner@gharanajunction.com`.
5. Click the **gear icon → Project settings**, scroll to **Your apps**, click the **`</>`** (web) icon, register the app with any nickname, and copy the `firebaseConfig` object shown.
6. Open `js/firebase-config.js` in this project and paste your values in place of the `PASTE_YOUR_...` placeholders.
7. Back in Firestore, open the **Rules** tab and replace the contents with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

   Click **Publish**. This means: anyone can *view* the menu, but only a logged-in owner can *change* it.

8. In the left menu: **Build → Storage → Get started**, keep the default settings, click **Done**. This is where item photos get stored. Go to the **Rules** tab of Storage and replace the contents with:

   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

   Click **Publish**. Same idea as before: anyone can view photos, only a logged-in owner can upload.

## 3. Add your menu

1. Push this project to GitHub and enable **GitHub Pages** (Settings → Pages → deploy from the `main` branch).
2. Open `https://yourusername.github.io/your-repo/owner.html`, log in with the email/password from step 2.4.
3. Go to the **Categories** tab → add your categories (Starters, Soups, etc.).
4. Go to the **Items** tab → tap **+** → fill in name, price, description, and (optionally) an image link, choose the category, save.
5. Open `https://yourusername.github.io/your-repo/index.html` — this is the link to share with customers (put it on a table QR code).

## 4. Item photos

When adding or editing an item in the owner panel, tap **Choose a photo** and pick an image straight from your phone or laptop — it uploads automatically (progress % is shown) and appears on the customer menu as soon as it finishes. No external site or link needed. Max size 5MB per photo. Leave it empty if you don't have a photo yet — the item still shows fine, just without an image.

## 5. Changing the WhatsApp number or business name

Open `js/firebase-config.js`:

```js
const BUSINESS_NAME = "Gharana Junction";
const WHATSAPP_NUMBER = "919132622222"; // country code + number, no + or spaces
```

Edit and save — no other changes needed.

## 6. File structure

```
gharana-junction-menu/
├── index.html            → customer menu page
├── owner.html             → owner login + dashboard
├── style.css               → shared styling
├── firebase-config.js       → your Firebase keys + business settings
├── customer.js                → customer page logic
├── owner.js                     → owner page logic
└── logo.jpeg                      → your logo
```

## 7. Notes

- Fully responsive — same files work on phone and laptop/desktop.
- The owner link (`owner.html`) is not indexed or linked from the customer page, but for real security don't share that URL publicly — only Firebase login (email + password) stands between it and the data.
- To add a second owner login later, just add another user in **Authentication → Users**.
