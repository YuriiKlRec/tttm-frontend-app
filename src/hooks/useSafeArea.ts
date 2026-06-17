import { useEffect } from 'react'
import {
  init,
  mountViewport,
  expandViewport,
  viewportSafeAreaInsetTop,
  viewportSafeAreaInsetBottom,
  viewportContentSafeAreaInsetTop,
  viewportContentSafeAreaInsetBottom,
} from '@telegram-apps/sdk'

/** Сума safe-area + content safe-area для однієї осі (px) */
const sumInset = (
  base: () => number | undefined,
  content: () => number | undefined,
): number => (base() ?? 0) + (content() ?? 0)

/** Записує safe-area інсети у CSS-змінні. Поза Telegram значення = 0 (fallback env() у CSS). */
const applySafeArea = (): void => {
  const root = document.documentElement.style
  root.setProperty(
    '--app-safe-top',
    `${sumInset(viewportSafeAreaInsetTop, viewportContentSafeAreaInsetTop)}px`,
  )
  root.setProperty(
    '--app-safe-bottom',
    `${sumInset(viewportSafeAreaInsetBottom, viewportContentSafeAreaInsetBottom)}px`,
  )
}

/**
 * Підключає Telegram viewport, синхронізує safe-area інсети у CSS-змінні
 * --app-safe-top / --app-safe-bottom. Працює і поза Telegram (no-op, fallback env()).
 */
export const useSafeArea = (): void => {
  useEffect(() => {
    try {
      init()
    } catch {
      // поза Telegram init кидає помилку — ігноруємо
    }

    if (expandViewport.isAvailable()) {
      expandViewport()
    }

    if (!mountViewport.isAvailable()) {
      return
    }

    const unsubscribers: Array<() => void> = []

    mountViewport()
      .then(() => {
        applySafeArea()
        unsubscribers.push(
          viewportSafeAreaInsetTop.sub(applySafeArea),
          viewportSafeAreaInsetBottom.sub(applySafeArea),
          viewportContentSafeAreaInsetTop.sub(applySafeArea),
          viewportContentSafeAreaInsetBottom.sub(applySafeArea),
        )
      })
      .catch(() => {
        // не вдалося підключити viewport — лишаємо fallback env()
      })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [])
}
