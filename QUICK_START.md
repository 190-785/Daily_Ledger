# 🚀 Quick Start Guide

Get Daily Ledger running in **5 minutes**!

---

## ⚡ Fastest Setup (Localhost)

### 1. Install Dependencies (1 min)
```bash
npm install
```

### 2. Configure Firebase (2 min)

**Get Firebase Config:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Click **Project Settings** (gear icon)
4. Scroll to **"Your apps"** → Click **"</>** (Web)
5. Copy the config object

**Update `src/firebase.js`:**
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Enable Firebase Services (1 min)

**Authentication:**
- Firebase Console → **Authentication** → **Get Started**
- Enable **Email/Password** provider

**Firestore:**
- Firebase Console → **Firestore Database** → **Create Database**
- Start in **Production mode**

### 4. Deploy Security Rules (30 sec)

**Copy Rules to Firebase:**
1. Open `firestore.rules` file
2. Copy **ALL** content (Ctrl+A, Ctrl+C)
3. Firebase Console → **Firestore** → **Rules** tab
4. Paste and click **"Publish"**

### 5. Run Development Server (30 sec)
```bash
npm run dev
```

### 6. Open in Browser
```
http://localhost:5173
```

---

## ✅ Verify Setup

### Test These Features:
1. **Signup**: Create account with username `testuser123`
2. **Login**: Log in with your credentials
3. **Create Member**: Add a test member
4. **Add Transaction**: Record a collection
5. **Dashboard**: Check if stats appear

### If Something Doesn't Work:
- **Check Browser Console** (F12) for errors
- **Verify Firebase Rules** are published (wait 60 seconds)
- **Check Firebase Config** in `src/firebase.js`
- **Ensure Auth & Firestore** are enabled in Firebase Console

---

## 🚀 Deploy to Production (Optional)

### Deploy to Vercel (5 min)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com/)
   - Click **"Add New Project"**
   - Import your GitHub repo
   - Deploy with default settings (Vite preset)

3. **Add Vercel Domain to Firebase**
   - Copy your Vercel URL (e.g., `daily-ledger.vercel.app`)
   - Firebase Console → **Authentication** → **Settings**
   - Add to **Authorized domains**

---

## 🎯 Next Steps

### Explore Features:
- ✅ **Members**: Add your collection members
- ✅ **Daily Ledger**: Track daily transactions
- ✅ **Lists**: Organize members into lists
- ✅ **Share**: Share lists with other users
- ✅ **Dashboard**: Analyze your data
- ✅ **Profile**: Update your settings

### Read Documentation:
- **[README.md](README.md)** - Full documentation
- **[PRODUCTION_DEPLOY_GUIDE.md](PRODUCTION_DEPLOY_GUIDE.md)** - Deployment details
- **[VERCEL_FIREBASE_GUIDE.md](VERCEL_FIREBASE_GUIDE.md)** - Architecture explained

### Customize:
- **Design System**: Edit `src/utils/designSystem.js`
- **Components**: Modify in `src/components/`
- **Pages**: Update in `src/pages/`

---

## 🐛 Troubleshooting

### "Missing or insufficient permissions"
✅ **Deploy Firestore rules** (step 4 above)

### "Auth domain not authorized"
✅ **Add localhost** to Firebase authorized domains
- Firebase Console → Authentication → Settings → Authorized domains
- `localhost` should already be there by default

### Build fails
✅ **Clear cache and reinstall**
```bash
rm -rf node_modules
npm install
```

### App doesn't load
✅ **Check Firebase config** in `src/firebase.js`
✅ **Open DevTools** (F12) and check Console tab for errors

---

## 💡 Tips

### Development:
- Use **React DevTools** for debugging
- Check **Firebase Console** for data
- Use **Network tab** to inspect Firebase calls
- Enable **Redux DevTools** if added

### Production:
- Test on **multiple devices** (desktop, mobile, tablet)
- Verify **PWA** features (offline, install prompt)
- Check **Lighthouse** scores (should be 90+)
- Monitor **Firebase usage** (stay within free tier)

---

## 📞 Need Help?

1. **Check README.md** - Comprehensive documentation
2. **Browser Console** - F12 for error messages
3. **Firebase Console** - Check logs and usage
4. **GitHub Issues** - Report bugs or request features

---

**That's it! You're ready to start using Daily Ledger! 🎉**

Happy collecting! 💰