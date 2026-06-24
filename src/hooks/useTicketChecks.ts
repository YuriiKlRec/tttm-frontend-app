import { useCallback, useMemo, useState } from 'react'
import { chunk } from '../utils/chunk'
import { includesPrice, totalTon } from '../utils/price'
import type { Check, Ticket, TicketStatus } from '../types/buyTickets'

/** Кількість ставок в одному чеку. */
export const CHUNK_SIZE = 8

/** Похідні підсумки одного чека. */
export interface CheckSummary {
  /** Кількість активних ставок (Total). */
  activeCount: number
  /** Сума активних ставок у TON (Pay). */
  payTon: string
  /** Ціни активних ставок (для success-екрана). */
  activePrices: number[]
}

/** Публічний інтерфейс хука керування чеками оплати. */
export interface UseTicketChecks {
  /** Усі чеки (розбиті по CHUNK_SIZE). */
  checks: Check[]
  /** Індекс активного чека (для слайдера). */
  activeIndex: number
  /** Перейти до чека за індексом. */
  goToCheck: (index: number) => void
  /** Перемкнути ставку active ↔ inactive (taken незмінний). */
  toggleTicket: (checkIndex: number, ticketIndex: number) => void
  /** Підсумки чека (Total/Pay/активні ціни). */
  summaryOf: (check: Check) => CheckSummary
  /** Оплата чека: симуляція бекенда. Повертає ціни, що стали taken. */
  payCheck: (checkIndex: number, simulateTaken: boolean) => number[]
  /** Перейти до наступного pending-чека (false, якщо такого немає). */
  goToNextPending: () => boolean
  /** Ціни всіх ставок, що НЕ active (inactive + taken) — для очищення корзини. */
  nonActivePrices: number[]
  /** Ціни успішно оплачених ставок (статус чека 'paid', тікет 'active') — для негайного видалення з корзини. */
  paidPrices: number[]
}

/** Будує підсумки чека: кількість/сума активних ставок. */
const buildSummary = (check: Check, ticketPrice: string): CheckSummary => {
  const active = check.tickets.filter((t) => t.status === 'active')
  return {
    activeCount: active.length,
    payTon: totalTon(active.length, ticketPrice),
    activePrices: active.map((t) => t.price),
  }
}

/**
 * Керує станом сторінки оплати: розбиває ціни на чеки по CHUNK_SIZE, тримає
 * статус кожної ставки (active/inactive/taken) та статус оплати кожного чека,
 * рахує Total/Pay і симулює оплату (частина ставок може стати taken).
 * @param prices заброньовані ціни (джерело — корзина або мок)
 * @param ticketPrice ціна одного квитка в TON
 */
export const useTicketChecks = (
  prices: number[],
  ticketPrice: string,
  takenPrices: number[] = [],
): UseTicketChecks => {
  // Початковий стан: ставки active (або taken, якщо ціна зайнята), чеки pending.
  const [checks, setChecks] = useState<Check[]>(() =>
    chunk(prices, CHUNK_SIZE).map((group) => ({
      status: 'pending' as const,
      tickets: group.map<Ticket>((price) => ({
        price,
        status: includesPrice(takenPrices, price) ? 'taken' : 'active',
      })),
    })),
  )
  const [activeIndex, setActiveIndex] = useState(0)

  const goToCheck = useCallback((index: number): void => setActiveIndex(index), [])

  const toggleTicket = useCallback((checkIndex: number, ticketIndex: number): void => {
    setChecks((prev) =>
      prev.map((check, ci) => {
        if (ci !== checkIndex) {
          return check
        }
        const tickets = check.tickets.map((ticket, ti) => {
          if (ti !== ticketIndex || ticket.status === 'taken') {
            return ticket
          }
          const next: TicketStatus = ticket.status === 'active' ? 'inactive' : 'active'
          return { ...ticket, status: next }
        })
        return { ...check, tickets }
      }),
    )
  }, [])

  const summaryOf = useCallback(
    (check: Check): CheckSummary => buildSummary(check, ticketPrice),
    [ticketPrice],
  )

  // Оплата: при simulateTaken робимо першу активну ставку чека taken (помилка
  // «зайнято»), success не настає. Інакше — усі активні оплачені, чек paid.
  const payCheck = useCallback((checkIndex: number, simulateTaken: boolean): number[] => {
    const newlyTaken: number[] = []
    setChecks((prev) =>
      prev.map((check, ci) => {
        if (ci !== checkIndex) {
          return check
        }
        if (!simulateTaken) {
          return { ...check, status: 'paid' as const }
        }
        const firstActive = check.tickets.findIndex((t) => t.status === 'active')
        if (firstActive === -1) {
          return { ...check, status: 'paid' as const }
        }
        const tickets = check.tickets.map((ticket, ti) =>
          ti === firstActive ? { ...ticket, status: 'taken' as const } : ticket,
        )
        newlyTaken.push(check.tickets[firstActive].price)
        return { ...check, tickets }
      }),
    )
    return newlyTaken
  }, [])

  const goToNextPending = useCallback((): boolean => {
    let moved = false
    setChecks((prev) => {
      const next = prev.findIndex((c, i) => i !== activeIndex && c.status === 'pending')
      if (next !== -1) {
        setActiveIndex(next)
        moved = true
      }
      return prev
    })
    return moved
  }, [activeIndex])

  const nonActivePrices = useMemo(
    () =>
      checks.flatMap((c) => c.tickets.filter((t) => t.status !== 'active').map((t) => t.price)),
    [checks],
  )

  // Ціни тікетів, що входять до ОПЛАЧЕНИХ чеків і лишились active —
  // саме вони підлягають негайному видаленню з корзини після успішної оплати.
  const paidPrices = useMemo(
    () =>
      checks
        .filter((c) => c.status === 'paid')
        .flatMap((c) => c.tickets.filter((t) => t.status === 'active').map((t) => t.price)),
    [checks],
  )

  return {
    checks,
    activeIndex,
    goToCheck,
    toggleTicket,
    summaryOf,
    payCheck,
    goToNextPending,
    nonActivePrices,
    paidPrices,
  }
}
