import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initPWA } from './utils/pwa.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Initialize PWA features
initPWA();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
