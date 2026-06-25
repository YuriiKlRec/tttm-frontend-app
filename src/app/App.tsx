import type { FC } from 'react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './router'
import { AuthProvider } from '../context/AuthProvider'
import { BookedCartProvider } from '../context/BookedCartProvider'
import { useSafeArea } from '../hooks/useSafeArea'
import { useTelegramSetup } from '../hooks/useTelegramSetup'
import { env } from '../config/env'

const MANIFEST_URL = 'https://dns.ton.org/tonconnect-manifest.json'

/** Кореневий компонент: провайдери (TonConnect → Auth → BookedCart) + роутер + safe-area. */
const App: FC = () => {
  useSafeArea()
  // Розгортання вʼюпорта + вимкнення вертикальних свайпів (свайп вниз не згортає апку)
  useTelegramSetup()

  return (
    <TonConnectUIProvider
      manifestUrl={MANIFEST_URL}
      actionsConfiguration={{
        // Повернення до Mini App після підписання транзакції у гаманці
        twaReturnUrl: env.tgMiniAppUrl as `${string}://${string}`,
        // Показуємо лише помилки — свій success-тост рендеримо самостійно
        notifications: ['error'],
      }}
    >
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
