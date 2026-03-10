import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Fail fast if API URL is not configured
if (!import.meta.env.VITE_API_URL) {
  throw new Error(
    'VITE_API_URL is not defined. Set it in your .env file (e.g. VITE_API_URL=https://api.example.com/api).'
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
