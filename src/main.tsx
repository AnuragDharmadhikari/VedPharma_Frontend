import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/app/store'
import { Toaster } from '@/components/ui/sonner'
import { LayoutProvider } from '@/shared/components/LayoutContext'
import AuthInitializer from '@/shared/components/AuthInitializer'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <LayoutProvider>
        <AuthInitializer>
          <App />
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: {
                background: 'var(--vp-bg-surface)',
                border: '1px solid var(--vp-border)',
                boxShadow: 'var(--vp-shadow-lg)',
              },
            }}
          />
        </AuthInitializer>
      </LayoutProvider>
    </Provider>
  </StrictMode>
)
