import { useEffect, useState } from 'react'
import { listPredictions, listWaiting } from '../services/gameApi'
import { useAuth } from './useAuth'

/** Лічильники для бейджів нижньої навігації (усі ігри у відповідній фазі). */
export interface NavBadges {
  /** Кількість ігор у фазі Predictions (isPredictions); null — ще не завантажено. */
  predictions: number | null
  /** Кількість ігор у фазі Waiting (isWaiting); null — ще не завантажено. */
  waiting: number | null
}

/** Інтервал оновлення лічильників (немає публічного lobby-каналу — періодичний refetch). */
const REFRESH_MS = 60_000

/**
 * Тягне загальну кількість ігор для фаз Predictions/Waiting через `meta.total`
 * (perPage=1 — лічильник, не список). Оновлює періодично, бо публічного
 * realtime-каналу для списків поки немає. Гейт на готовність авторизації.
 */
export function useNavBadges(): NavBadges {
  const { user, ready } = useAuth()
  const myUserId = user?.id ?? null
  const [badges, setBadges] = useState<NavBadges>({ predictions: null, waiting: null })

  useEffect(() => {
    if (!ready) return
    let cancelled = false

    const load = async (): Promise<void> => {
      try {
        const [pred, wait] = await Promise.all([
          listPredictions(1, 1, myUserId),
          listWaiting(1, 1, myUserId),
        ])
        if (!cancelled) setBadges({ predictions: pred.total, waiting: wait.total })
      } catch {
        // Лічильник не критичний — не падаємо, лишаємо попереднє значення
      }
    }

    void load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [ready, myUserId])

  return badges
}
