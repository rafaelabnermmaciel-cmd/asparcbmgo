import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './lib/theme.jsx'
import { AdminProvider } from './lib/admin.jsx'
import { StoreProvider } from './lib/store.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AdminProvider>
        <StoreProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </StoreProvider>
      </AdminProvider>
    </ThemeProvider>
  </StrictMode>,
)
