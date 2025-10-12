# 💰 Daily Ledger - Smart Collection Tracker

> A modern, real-time collection management system built with React, Firebase, and Tailwind CSS. Track daily collections, manage members, share lists, and analyze financial data with an intuitive dashboard.

[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.3.0-orange.svg)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-7.1.9-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.14-cyan.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

---

## 🌟 Features

### 💳 **Collection Management**
- **Daily Ledger**: Track daily transactions for each member
- **Member Management**: Add, edit, and organize collection members
- **Monthly Targets**: Set and monitor monthly collection goals
- **Real-time Updates**: Instant synchronization across all devices

### 📊 **Analytics Dashboard**
- **Daily Summary**: View today's collections at a glance
- **Monthly Overview**: Track progress toward monthly targets
- **Payment Status**: See who paid today and who has outstanding balances
- **Historical Data**: Access past transactions and trends

### 🔗 **List Sharing**
- **Share Lists**: Collaborate with other users by sharing collection lists
- **Username Search**: Find users by their unique username
- **Access Control**: Manage who can view your shared lists
- **Real-time Sync**: Shared lists update instantly for all users

### 👤 **User Profiles**
- **Unique Usernames**: Claim your unique @username
- **Profile Management**: Update your name, email, and password
- **Secure Authentication**: Firebase Authentication with email/password
- **Data Privacy**: Your data is protected by Firestore security rules

### 📱 **Progressive Web App (PWA)**
- **Installable**: Add to home screen on mobile devices
- **Offline Support**: Access your data even without internet
- **Push Notifications**: Stay updated with important events (coming soon)
- **Native Experience**: Feels like a native mobile app

### 🎨 **Modern Design**
- **Responsive UI**: Works perfectly on desktop, tablet, and mobile
- **Dark Mode Ready**: Custom design system with beautiful gradients
- **Smooth Animations**: Polished transitions and interactions
- **Accessible**: Built with accessibility best practices

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** or **pnpm**
- **Firebase Account** (free tier works great!)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/190-785/Daily_Ledger.git
   cd Daily_Ledger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase** (see [Firebase Setup](#-firebase-setup) below)

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5173
   ```

---

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name it (e.g., "daily-ledger")
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Enable **"Email/Password"** provider
4. Save

### 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select a location (closest to your users)
5. Click **"Enable"**

### 4. Deploy Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Copy the entire content from `firestore.rules` file
3. Paste into the editor
4. Click **"Publish"**

### 5. Configure Your App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"**
3. Click **"</>"** (Web app)
4. Register your app (name: "Daily Ledger Web")
5. Copy the Firebase config object

6. Add Firebase config via environment variables

   Copy `.env.example` to `.env` at the project root and fill in your Firebase values. Vite exposes vars prefixed with `VITE_` to the client.

   Example (.env):

   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=1:...:web:...
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXX
   ```

   The app automatically loads these values from `import.meta.env` at runtime; you don't need to edit `src/firebase.js` directly.

### 6. Add Authorized Domains

For production deployment (Vercel, etc.):
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your production domain (e.g., `your-app.vercel.app`)

---

## 🛠️ Development

### Available Scripts

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### Project Structure

```
Daily_Ledger/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Service worker for offline support
│   └── favicon.svg            # App icon
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Table.jsx
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Sidebar.jsx
│   │   ├── BottomNav.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── ... (modals, animations, etc.)
│   ├── pages/                 # Page components
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── LedgerPage.jsx
│   │   ├── MembersPage.jsx
│   │   ├── ListsPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── MonthlyViewPage.jsx
│   ├── hooks/                 # Custom React hooks
│   │   └── useValidation.js
│   ├── utils/                 # Utility functions
│   │   ├── designSystem.js
│   │   ├── validation.js
│   │   ├── statsCalculator.js
│   │   └── pwa.js
│   ├── firebase.js            # Firebase configuration & helpers
│   ├── App.jsx                # Main app component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── firestore.rules            # Firebase security rules
├── vercel.json                # Vercel deployment config
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies & scripts
└── README.md                  # This file
```

---

## 🎨 Tech Stack

### Frontend
- **[React 19.1.1](https://reactjs.org/)** - UI library with latest features
- **[React Router DOM 7.9.3](https://reactrouter.com/)** - Client-side routing
- **[Vite 7.1.9](https://vitejs.dev/)** - Lightning-fast build tool
- **[Tailwind CSS 4.1.14](https://tailwindcss.com/)** - Utility-first CSS framework

### Backend & Services
- **[Firebase 12.3.0](https://firebase.google.com/)** - Backend-as-a-Service
  - **Authentication** - Secure user auth with email/password
  - **Firestore** - Real-time NoSQL database
  - **Security Rules** - Server-side data protection

### PWA & Performance
- **Service Worker** - Offline support & caching
- **Web Manifest** - Installable app metadata
- **Code Splitting** - Optimized bundle loading

### Development Tools
- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

---

## 🔒 Security

### Firestore Security Rules
All data access is protected by comprehensive Firestore Security Rules:

- ✅ **Authentication Required**: Most operations require user authentication
- ✅ **Owner-Only Access**: Users can only access their own data
- ✅ **Input Validation**: String lengths, formats, and types are validated
- ✅ **Timestamp Validation**: Prevents backdating and future-dating
- ✅ **Rate Limiting**: Max amounts (1M per transaction) and list sizes (1000 members)
- ✅ **Immutable Data**: Usernames cannot be changed after creation
- ✅ **Sharing Controls**: List sharing requires explicit permission

### Best Practices
- 🔐 Firebase API keys are **public by design** (safe in client-side code)
- 🔐 All sensitive operations validated on Firebase servers
- 🔐 Security rules cannot be bypassed by modified client code
- 🔐 User data isolated by Firebase Auth UID

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com/)
   - Click **"Add New Project"**
   - Import your GitHub repository
   - Configure:
     - Framework Preset: **Vite**
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Click **"Deploy"**

3. **Update Firebase Settings**
   - Add Vercel domain to Firebase authorized domains
   - Firebase Console → Authentication → Settings → Authorized domains

4. **Deploy Firestore Rules**
   - Copy content from `firestore.rules`
   - Paste into Firebase Console → Firestore → Rules
   - Click **"Publish"**

### Deploy to Other Platforms

The app works on any static hosting platform:
- **Netlify**: Deploy from GitHub with Vite preset
- **GitHub Pages**: Use `gh-pages` npm package
- **Firebase Hosting**: `firebase init hosting` + `firebase deploy`

See [PRODUCTION_DEPLOY_GUIDE.md](PRODUCTION_DEPLOY_GUIDE.md) for detailed instructions.

---

## 📖 Documentation

### Essential Docs
- **[CODE_AUDIT_REPORT.md](CODE_AUDIT_REPORT.md)** - Code quality analysis (9/10 score)
- **[PRODUCTION_DEPLOY_GUIDE.md](PRODUCTION_DEPLOY_GUIDE.md)** - Step-by-step deployment
- **[VERCEL_FIREBASE_GUIDE.md](VERCEL_FIREBASE_GUIDE.md)** - Architecture explanation
- **[FIREBASE_RULES_FINAL.md](FIREBASE_RULES_FINAL.md)** - Security rules guide
- **[LICENSE](LICENSE)** - MIT License

### Key Features Explained

#### 1. Daily Ledger System
Track daily collections for each member with:
- Custom amounts per member
- Date-based organization
- Real-time updates across devices
- Historical transaction records

#### 2. Dashboard Analytics
View comprehensive statistics:
- **Daily Tab**: Today's collections and payment status
- **Monthly Tab**: Progress toward monthly targets
- **Paid/Didn't Pay**: Filter by payment status
- **Outstanding Balances**: See who owes money

#### 3. List Sharing
Collaborate with others:
- Share lists by username search
- Real-time synchronization
- Access control per list
- View shared lists from others

#### 4. Username System
Unique identifier for each user:
- 3-20 characters, lowercase alphanumeric + underscore
- Checked for availability during signup
- Immutable after creation
- Used for list sharing

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
1. Follow existing code style
2. Use meaningful component and variable names
3. Add comments for complex logic
4. Test thoroughly before submitting
5. Update documentation as needed

### Code Standards
- **Components**: Use functional components with hooks
- **Styling**: Use Tailwind CSS utility classes
- **State Management**: React hooks (useState, useEffect, etc.)
- **Firebase**: Use async/await for all Firebase operations
- **Error Handling**: Always wrap Firebase calls in try/catch

---

## 🐛 Troubleshooting

### Common Issues

**"Missing or insufficient permissions"**
- Deploy updated `firestore.rules` to Firebase Console
- Wait 60 seconds for rules to propagate
- Clear browser cache and hard refresh

**"Auth domain not authorized"**
- Add your domain to Firebase authorized domains
- Firebase Console → Authentication → Settings → Authorized domains

**Build errors**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Update dependencies: `npm update`

**Service Worker not updating**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear application cache in DevTools (F12 → Application → Clear storage)

---

## 📊 Performance

- ⚡ **Lighthouse Score**: 90+ on all metrics
- 🚀 **Build Time**: ~13 seconds
- 📦 **Bundle Size**: ~805 KB (208 KB gzipped)
- 🌐 **First Contentful Paint**: < 1s (on Vercel CDN)
- 📱 **Mobile Optimized**: Responsive design for all screen sizes

---

## 📱 Progressive Web App (PWA)

The app can be installed on devices:

### Desktop (Chrome/Edge)
- Look for **"Install"** icon in address bar
- Click to install as desktop app

### Mobile (Android/iOS)
- Tap browser menu (⋮)
- Select **"Add to Home Screen"**
- App icon appears on home screen

### Offline Support
- View cached data without internet
- Add transactions offline (syncs when online)
- Service worker caches app assets

---

## 🔄 Updates & Roadmap

### Current Version: 1.0.0
- ✅ Core ledger functionality
- ✅ User authentication
- ✅ Dashboard analytics
- ✅ List sharing
- ✅ PWA support
- ✅ Mobile responsive
- ✅ Production-ready

### Upcoming Features
- 🔜 Export data (CSV, PDF)
- 🔜 Dark mode toggle
- 🔜 Push notifications
- 🔜 Advanced filtering & search
- 🔜 Charts & visualizations
- 🔜 Multi-currency support

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

### GPL-3.0 Summary
- ✅ **Freedom to use** - Use the software for any purpose
- ✅ **Freedom to study** - Access and modify the source code
- ✅ **Freedom to share** - Distribute copies to help others
- ✅ **Freedom to improve** - Distribute modified versions
- ⚠️ **Copyleft** - Derivative works must also be GPL-3.0
- ⚠️ **Source disclosure** - Modified versions must include source code

---

## 👨‍💻 Author

**190-785**
- GitHub: [@190-785](https://github.com/190-785)
- Repository: [Daily_Ledger](https://github.com/190-785/Daily_Ledger)

---

## 🙏 Acknowledgments

- **React Team** - For the amazing React library
- **Vite Team** - For the blazing-fast build tool
- **Tailwind CSS** - For the utility-first CSS framework
- **Firebase** - For the powerful backend services
- **Vercel** - For the excellent hosting platform

---

## 💬 Support

If you have any questions or need help:
1. Check the [documentation files](.)
2. Review [Firebase docs](https://firebase.google.com/docs)
3. Open an issue on GitHub
4. Check browser console for error messages

---

<div align="center">

**⭐ Star this repo if you find it helpful! ⭐**

Made with ❤️ using React, Firebase, and Tailwind CSS

</div>
