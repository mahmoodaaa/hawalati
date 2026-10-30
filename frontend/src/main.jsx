import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LanguageProvider } from './context/LanguageContext.jsx'
import LocalizedApplication from './LocalizedApplication.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider><LocalizedApplication /></LanguageProvider>
  </StrictMode>,
)
