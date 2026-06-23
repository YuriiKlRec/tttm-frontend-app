import type { FC } from 'react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './router'
import { AuthProvider } from '../context/AuthProvider'
import { BookedCartProvider } from '../context/BookedCartProvider'
import { useSafeArea } from '../hooks/useSafeArea'

const MANIFEST_URL = 'https://dns.ton.org/tonconnect-manifest.json'

/** Кореневий компонент: провайдери (TonConnect → Auth → BookedCart) + роутер + safe-area. */
const App: FC = () => {
  useSafeArea()

  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <AuthProvider>
        <BookedCartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </BookedCartProvider>
      </AuthProvider>
    </TonConnectUIProvider>
  )
}

export default App
