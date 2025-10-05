import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initPWA } from './utils/pwa.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Initialize PWA features
initPWA();

// Initialize theme from localStorage or default to light
if (typeof document !== 'undefined') {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
