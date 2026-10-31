import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/jetbrains-mono'
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
