import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBuyTicketsFlow } from '@/hooks/useBuyTicketsFlow'
import { trackEvent } from '@/services/analytics'
import { prepareTicketTx, createTickets } from '@/services/ticketApi'
import { ValidationError } from '@/services/http'

vi.mock('@/services/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('@/services/ticketApi', () => ({
  prepareTicketTx: vi.fn(),
  createTickets: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'player-1' } }),
}))

const removeManyMock = vi.fn()
vi.mock('@/context/BookedCartProvider', () => ({
  useBookedCart: () => ({
    gameId: 'game-1',
    prices: [10],
    setGameId: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    removeMany: removeManyMock,
    clear: vi.fn(),
    has: vi.fn(),
  }),
}))

const sendTransactionMock = vi.fn().mockResolvedValue({ boc: 'boc-1' })
const openModalMock = vi.fn()
vi.mock('@tonconnect/ui-react', () => ({
  useTonConnectUI: () => [{ openModal: openModalMock, sendTransaction: sendTransactionMock }],
  useTonAddress: () => 'EQPlayerAddress',
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const renderFlow = (): ReturnType<typeof renderHook<ReturnType<typeof useBuyTicketsFlow>, unknown>> =>
  renderHook(() => useBuyTicketsFlow([10], '5', []))

describe('useBuyTicketsFlow — аналітика оплати ставок', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendTransactionMock.mockResolvedValue({ boc: 'boc-1' })
  })

  it('НЕ шле bet_placed після успішної оплати (подія переїхала на бекенд)', async () => {
    vi.mocked(prepareTicketTx).mockResolvedValue({
      to: 'EQContract',
      value: '1000000000',
      payload: 'payload',
      stateInit: null,
      gameId: 'game-1',
      prices: [10],
      ticketCount: 1,
      ticketAmount: 5,
    })
    vi.mocked(createTickets).mockResolvedValue({
      message: 'ok',
      tickets: [{ id: 't1', price: 10, gameId: 'game-1', ownerId: 'player-1' }],
      transactionHash: 'hash-1',
    })

    const { result } = renderFlow()

    await act(async () => {
      result.current.handleCta()
    })

    await waitFor(() => expect(createTickets).toHaveBeenCalled())
    expect(trackEvent).not.toHaveBeenCalledWith('bet_placed', expect.anything())
  })

  it('шле validation_error(context=bet_payment) на 422 від createTickets', async () => {
    vi.mocked(prepareTicketTx).mockResolvedValue({
      to: 'EQContract',
      value: '1000000000',
      payload: 'payload',
      stateInit: null,
      gameId: 'game-1',
      prices: [10],
      ticketCount: 1,
      ticketAmount: 5,
    })
    vi.mocked(createTickets).mockRejectedValue(new ValidationError(['price taken']))

    const { result } = renderFlow()

    await act(async () => {
      result.current.handleCta()
    })

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('validation_error', {
        context: 'bet_payment',
        field: 'ticket_price',
        error_type: 'price_taken',
        user_id: 'player-1',
      })
    })
  })

  it('шле action_cancelled на відмову користувача від транзакції', async () => {
    vi.mocked(prepareTicketTx).mockResolvedValue({
      to: 'EQContract',
      value: '1000000000',
      payload: 'payload',
      stateInit: null,
      gameId: 'game-1',
      prices: [10],
      ticketCount: 1,
      ticketAmount: 5,
    })
    sendTransactionMock.mockRejectedValueOnce(new Error('User declined the transaction'))

    const { result } = renderFlow()

    await act(async () => {
      result.current.handleCta()
    })

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('action_cancelled', {
        context: 'bet_payment',
        user_id: 'player-1',
      })
    })
    expect(createTickets).not.toHaveBeenCalled()
  })
})
