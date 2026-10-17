import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/sora'
import './index.css'
import { App } from './app/App.jsx'
import { registerServiceWorker } from './services/pushService'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker for phone notifications (Web Push)
window.addEventListener('load', () => {
  registerServiceWorker()
})
