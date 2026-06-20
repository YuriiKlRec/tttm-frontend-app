import type { FC } from 'react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './router'
import { BookedCartProvider } from '../context/BookedCartProvider'
import { useSafeArea } from '../hooks/useSafeArea'

const MANIFEST_URL = 'https://dns.ton.org/tonconnect-manifest.json'

/** Кореневий компонент: провайдери (TonConnect) + роутер + safe-area. */
const App: FC = () => {
  useSafeArea()

  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <BookedCartProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </BookedCartProvider>
    </TonConnectUIProvider>
  )
}

export default App
