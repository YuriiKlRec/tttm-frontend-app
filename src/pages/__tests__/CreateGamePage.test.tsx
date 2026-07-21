import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CreateGamePage from '../CreateGamePage'
import { trackEvent } from '../../services/analytics'
import { createGameTransaction, createGame } from '../../services/gameApi'
import { ValidationError } from '../../services/http'
import type { CreateGameForm } from '../../hooks/useCreateGameForm'

vi.mock('../../services/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('../../services/walletApi', () => ({ saveWallet: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../services/gameApi', () => ({
  createGameTransaction: vi.fn(),
  createGame: vi.fn(),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'org-1', nickname: 'organizer' } }),
}))
vi.mock('../../i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const sendTransactionMock = vi.fn().mockResolvedValue({ boc: 'boc-value' })
const openModalMock = vi.fn()
vi.mock('@tonconnect/ui-react', () => ({
  useTonConnectUI: () => [{ openModal: openModalMock, sendTransaction: sendTransactionMock }],
  useTonAddress: () => 'EQTestOwnerAddress',
  TonConnectButton: () => null,
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

const validForm: CreateGameForm = {
  name: 'My game',
  setName: vi.fn(),
  nameError: null,
  predictionTime: Date.UTC(2026, 7, 1, 12, 0, 0),
  setPredictionTime: vi.fn(),
  timeError: null,
  deadline: Date.UTC(2026, 7, 1, 11, 0, 0),
  deadlineOffset: 60,
  deadlineMin: 5,
  deadlineMax: 55,
  setDeadlineOffset: vi.fn(),
  ticketPrice: '1.5',
  setTicketPrice: vi.fn(),
  priceError: null,
  pool: 10,
  setPool: vi.fn(),
  blurName: vi.fn(),
  blurPrice: vi.fn(),
  isValid: true,
  isDirty: false,
}

vi.mock('../../hooks/useCreateGameForm', () => ({
  useCreateGameForm: () => validForm,
}))

const renderPage = (): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <CreateGamePage />
    </MemoryRouter>,
  )

const clickPay = async (): Promise<void> => {
  const payButton = await screen.findByText('createGame.payForCreation')
  fireEvent.click(payButton)
}

describe('CreateGamePage — аналітика оплати', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendTransactionMock.mockResolvedValue({ boc: 'boc-value' })
  })

  it('шле game_param_filled з коректним game_config на клік Pay', async () => {
    vi.mocked(createGameTransaction).mockResolvedValue({
      valid: true,
      to: 'EQContract',
      value: '1000000000',
      payload: 'payload',
      stateInit: null,
      contractAddress: 'EQContract',
      gameId: 42,
    })
    vi.mocked(createGame).mockResolvedValue({ id: 'game-1' } as Awaited<ReturnType<typeof createGame>>)

    renderPage()
    await clickPay()

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('game_param_filled', {
        organizer_id: 'org-1',
        game_config: {
          bet_size: 1.5,
          end_time: new Date(validForm.predictionTime).toISOString(),
          commission: 10,
          accept_until: new Date(validForm.deadline).toISOString(),
        },
      })
    })
  })

  it('НЕ шле game_created з клієнта після успішного створення гри', async () => {
    vi.mocked(createGameTransaction).mockResolvedValue({
      valid: true,
      to: 'EQContract',
      value: '1000000000',
      payload: 'payload',
      stateInit: null,
      contractAddress: 'EQContract',
      gameId: 42,
    })
    vi.mocked(createGame).mockResolvedValue({ id: 'game-1' } as Awaited<ReturnType<typeof createGame>>)

    renderPage()
    await clickPay()

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/game/game-1', { replace: true }))

    expect(trackEvent).not.toHaveBeenCalledWith('game_created', expect.anything())
  })

  it('шле validation_error(context=game_creation_payment) на ValidationError від createGame', async () => {
    vi.mocked(createGameTransaction).mockResolvedValue({
      valid: true,
      to: 'EQContract',
      value: '1000000000',
      payload: 'payload',
      stateInit: null,
      contractAddress: 'EQContract',
      gameId: 42,
    })
    vi.mocked(createGame).mockRejectedValue(new ValidationError(['ticketAmount too low']))

    renderPage()
    await clickPay()

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('validation_error', {
        context: 'game_creation_payment',
        field: 'ticketAmount too low',
        error_type: 'validation_error',
        user_id: 'org-1',
      })
    })
  })

  it('шле action_cancelled на відмову користувача від транзакції', async () => {
    vi.mocked(createGameTransaction).mockResolvedValue({
      valid: true,
      to: 'EQContract',
      value: '1000000000',
      payload: 'payload',
      stateInit: null,
      contractAddress: 'EQContract',
      gameId: 42,
    })
    sendTransactionMock.mockRejectedValueOnce(new Error('User declined the transaction'))

    renderPage()
    await clickPay()

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('action_cancelled', {
        context: 'game_creation_payment',
        user_id: 'org-1',
      })
    })
    expect(createGame).not.toHaveBeenCalled()
  })
})
