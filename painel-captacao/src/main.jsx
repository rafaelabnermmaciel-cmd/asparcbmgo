import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './lib/theme.jsx'
import SenhaGate from './components/SenhaGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <SenhaGate>
        <HashRouter>
          <App />
        </HashRouter>
      </SenhaGate>
    </ThemeProvider>
  </StrictMode>,
)
