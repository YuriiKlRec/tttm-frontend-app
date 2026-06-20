import { useCallback, useEffect, useState, type RefObject } from 'react'

/** Публічний стан/API скролу до кінця контейнера. */
export interface ScrollToEnd {
  /** Поточний стан: чи прокручено до самого низу. */
  atBottom: boolean
  /** Sticky: стає true коли вперше досягнуто низу, далі лишається true. */
  reachedEnd: boolean
  /** Плавно прокрутити контейнер донизу. */
  scrollToBottom: () => void
  /** Плавно прокрутити контейнер догори. */
  scrollToTop: () => void
}

/** Поріг у px, у межах якого вважаємо, що ми «біля низу». */
const BOTTOM_THRESHOLD = 4

/**
 * Відстежує прокрутку контейнера: поточний стан `atBottom`, sticky-прапор
 * `reachedEnd` (true назавжди після першого досягнення низу) та плавні скрол-дії.
 * Слухає `scroll` контейнера й `resize` вікна, перераховує на mount.
 */
export const useScrollToEnd = (ref: RefObject<HTMLElement | null>): ScrollToEnd => {
  const [atBottom, setAtBottom] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(false)

  const recompute = useCallback((): void => {
    const el = ref.current
    if (!el) {
      return
    }
    const isBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_THRESHOLD
    setAtBottom(isBottom)
    if (isBottom) {
      setReachedEnd(true)
    }
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    recompute()
    el.addEventListener('scroll', recompute, { passive: true })
    window.addEventListener('resize', recompute)
    // Поява кнопки Accept змінює висоту контейнера (clientHeight), а не вікна —
    // тож стежимо саме за розміром елемента, щоб atBottom лишався коректним.
    const observer = new ResizeObserver(recompute)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', recompute)
      window.removeEventListener('resize', recompute)
      observer.disconnect()
    }
  }, [ref, recompute])

  const scrollToBottom = useCallback((): void => {
    const el = ref.current
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [ref])

  const scrollToTop = useCallback((): void => {
    ref.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [ref])

  return { atBottom, reachedEnd, scrollToBottom, scrollToTop }
}
