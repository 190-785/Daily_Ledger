import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initPWA } from './utils/pwa.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Initialize PWA features
initPWA();

// Initialize dark theme as default
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark-theme');
  localStorage.setItem('theme', 'dark');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
