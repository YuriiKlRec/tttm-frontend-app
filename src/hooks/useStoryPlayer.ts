import { useCallback, useEffect, useRef, useState } from 'react'

/** Параметри плеєра історій (stories-онбординг). */
interface UseStoryPlayerOptions {
  /** Кількість слайдів. */
  slideCount: number
  /** Тривалість кожного слайда, мс (індекс = індекс слайда). */
  durations: number[]
  /** Викликається один раз при спробі перейти далі за останній слайд. */
  onFinish: () => void
}

/** Публічний API плеєра історій. */
export interface StoryPlayer {
  /** Поточний індекс слайда. */
  index: number
  /** Прогрес поточного слайда, 0..1. */
  progress: number
  /** Чи призупинено автоплей (утримання пальця). */
  paused: boolean
  /** Перейти вперед; з останнього слайда викликає onFinish. */
  goNext: () => void
  /** Перейти назад; з першого слайда рестартує прогрес поточного. */
  goPrev: () => void
  /** Призупинити автоплей. */
  pause: () => void
  /** Відновити автоплей. */
  resume: () => void
}

/** Значення-«недійсний індекс» — примушує tick() побачити розбіжність і скинути прогрес,
 *  навіть якщо сам index не змінюється (рестарт першого слайда на goPrev). */
const INVALIDATE_TICK = -1

/**
 * Логіка плеєра stories-онбордингу: індекс слайда, прогрес поточного слайда (0..1)
 * і пауза. Таймер реалізовано через requestAnimationFrame з накопиченням elapsed —
 * це дозволяє паузі працювати точно (без дрейфу на кшталт setInterval).
 *
 * Скидання прогресу при зміні слайда відбувається всередині самого rAF-колбека
 * (tick) — єдине джерело правди, а не в окремому useEffect: це узгоджується з
 * react-hooks/set-state-in-effect (setState дозволено лише в колбеку зовнішньої
 * системи, яким rAF і є) та react-hooks/refs (ref-мутації лише поза рендером).
 */
export const useStoryPlayer = ({ slideCount, durations, onFinish }: UseStoryPlayerOptions): StoryPlayer => {
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  // Накопичений час поточного слайда (мс) і мітка попереднього кадру rAF.
  const elapsedRef = useRef(0)
  const lastTsRef = useRef<number | null>(null)
  // Індекс, для якого tick() востаннє рахував elapsed — розбіжність з indexRef
  // (ручний перехід або goPrev-рестарт) сигналізує про потребу скинути прогрес.
  const tickedIndexRef = useRef(0)

  // Свіжі значення для читання всередині rAF-колбека без застарілих замикань.
  const pausedRef = useRef(paused)
  const indexRef = useRef(index)
  const durationsRef = useRef(durations)
  const onFinishRef = useRef(onFinish)
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { indexRef.current = index }, [index])
  useEffect(() => { durationsRef.current = durations }, [durations])
  useEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  useEffect(() => {
    let rafId: number

    const tick = (ts: number): void => {
      // Слайд змінився (тап/клавіатура/авто-перехід із попереднього кадру, чи
      // примусовий рестарт через INVALIDATE_TICK) — скидаємо елапс і прогрес.
      if (tickedIndexRef.current !== indexRef.current) {
        tickedIndexRef.current = indexRef.current
        elapsedRef.current = 0
        lastTsRef.current = null
        setProgress(0)
      }

      if (lastTsRef.current === null) {
        lastTsRef.current = ts
      }
      const delta = ts - lastTsRef.current
      lastTsRef.current = ts

      if (!pausedRef.current) {
        elapsedRef.current += delta
        const duration = durationsRef.current[indexRef.current] ?? 5000
        const ratio = elapsedRef.current / duration

        if (ratio >= 1) {
          const isLast = indexRef.current >= slideCount - 1
          if (isLast) {
            onFinishRef.current()
            return // зупиняємо цикл — навігація завершує слайд-шоу
          }
          setIndex((i) => i + 1)
        } else {
          setProgress(ratio)
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [slideCount])

  const goNext = useCallback((): void => {
    if (index >= slideCount - 1) {
      onFinishRef.current()
      return
    }
    setIndex(index + 1)
  }, [index, slideCount])

  const goPrev = useCallback((): void => {
    if (index <= 0) {
      // На першому слайді "назад" — рестарт прогресу поточного, а не перехід.
      // Ref-мутація в обробнику події (не в рендері) — дозволена.
      tickedIndexRef.current = INVALIDATE_TICK
      return
    }
    setIndex(index - 1)
  }, [index])

  const pause = useCallback((): void => setPaused(true), [])
  const resume = useCallback((): void => setPaused(false), [])

  return { index, progress, paused, goNext, goPrev, pause, resume }
}
