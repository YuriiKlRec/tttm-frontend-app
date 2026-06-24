import { useCallback, useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { CreateGameHeader } from '../components/create-game/CreateGameHeader'
import { GameNameField } from '../components/create-game/GameNameField'
import { PairDisplay } from '../components/create-game/PairDisplay'
import { DateTimeField } from '../components/create-game/DateTimeField'
import { DeadlineControl } from '../components/create-game/DeadlineControl'
import { TicketPriceField } from '../components/create-game/TicketPriceField'
import { PrizePoolControl } from '../components/create-game/PrizePoolControl'
import { CreateFooter } from '../components/create-game/CreateFooter'
import { ConfirmModal } from '../components/buy/ConfirmModal'
import { useCreateGameForm } from '../hooks/useCreateGameForm'
import { createGameTransaction, createGame } from '../services/gameApi'
import { saveWallet } from '../services/walletApi'
import { env } from '../config/env'
import { ValidationError } from '../services/http'
import { isUserRejection } from '../utils/isUserRejection'
import thinkingBadge from '../assets/badge-face-thinking.svg'

/** nanoTON в одному TON. */
const NANO_PER_TON = 1_000_000_000

/** Часовий ліміт транзакції (сек) — 10 хвилин. */
const TX_VALID_SECONDS = 600

/**
 * Сторінка «New prediction game» — окремий fullscreen-лайаут (поза AppLayout):
 * фіксована шапка та підвал, скрол-тіло з полями форми. Логіка винесена у
 * useCreateGameForm; вихід зі змінами підтверджується модалкою.
 * Підтвердження форми → TonConnect-транзакція → збереження гри у БД.
 */
const CreateGamePage: FC = () => {
  const navigate = useNavigate()
  const form = useCreateGameForm()
  const [tonConnectUI] = useTonConnectUI()
  const address = useTonAddress()

  // Чи показано модалку підтвердження виходу.
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Помилка транзакції або API (відображається у підвалі).
  const [txError, setTxError] = useState<string | null>(null)
  // Чи виконується транзакція.
  const [submitting, setSubmitting] = useState(false)

  // «Go back»: за наявності змін — спершу підтвердження, інакше вихід одразу.
  const handleBack = useCallback((): void => {
    if (form.isDirty) {
      setConfirmOpen(true)
      return
    }
    void navigate('/')
  }, [form.isDirty, navigate])

  const handlePay = useCallback((): void => {
    // Якщо гаманець не підключений — відкриваємо модалку TonConnect.
    if (!address) {
      void tonConnectUI.openModal()
      return
    }

    if (!form.isValid || submitting) {
      return
    }

    const run = async (): Promise<void> => {
      setTxError(null)
      setSubmitting(true)

      try {
        // Крок 1: зберегти гаманець на бекенді (ігноруємо помилку — не критично).
        try {
          await saveWallet(address)
        } catch {
          // Гаманець може вже бути збережений — не блокуємо флоу.
        }

        // Крок 2: підготовка транзакції контракту.
        // ticketAmount у nanoTON: значення форми (TON) × 1_000_000_000.
        const ticketAmount = Math.round(Number(form.ticketPrice) * NANO_PER_TON)
        const endTimeIso = new Date(form.predictionTime).toISOString()
        const ticketDeadlineIso = new Date(form.deadline).toISOString()

        const txResp = await createGameTransaction({
          owner: address,
          name: form.name,
          endTime: endTimeIso,
          ticketDeadline: ticketDeadlineIso,
          ticketAmount,
          authorPercent: form.pool,
        })

        // Крок 3: відправити транзакцію через TonConnect.
        // DB-запис виконується ТІЛЬКИ після підтвердження користувачем —
        // щоб уникнути phantom-рядків у разі відмови від транзакції.
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + TX_VALID_SECONDS,
          messages: [
            {
              address: txResp.to,
              amount: txResp.value,
              payload: txResp.payload,
              stateInit: txResp.stateInit ?? undefined,
            },
          ],
        })

        // Крок 4: зберегти гру у БД (тільки якщо транзакція підтверджена).
        const gameResp = await createGame({
          name: form.name,
          targetCurrency: 'BTCUSDT',
          ticketAmount,
          authorPercent: form.pool,
          endTime: endTimeIso,
          ticketDeadlineAt: ticketDeadlineIso,
          walletAddress: address,
          isPublic: true,
          contractGameId: txResp.gameId,
          tonData: {
            network: env.tonNetwork,
            contractAddress: txResp.contractAddress,
          },
        })

        // Крок 5: навігація до нової гри.
        void navigate(`/game/${gameResp.id}`)
      } catch (err) {
        // Відмова користувача від транзакції — тихо виходимо, без повідомлення.
        if (isUserRejection(err)) {
          return
        }

        if (err instanceof ValidationError) {
          setTxError(err.errors.join('; '))
          return
        }

        setTxError(err instanceof Error ? err.message : 'Помилка створення гри')
      } finally {
        setSubmitting(false)
      }
    }

    void run()
  }, [address, form, tonConnectUI, submitting, navigate])

  // Скасування виходу: лишитись на сторінці.
  const cancelLeave = useCallback((): void => setConfirmOpen(false), [])

  // Підтвердження виходу: перейти на головну.
  const confirmLeave = useCallback((): void => {
    void navigate('/')
  }, [navigate])

  // CTA активна: форма валідна та не йде транзакція.
  const canPay = address ? (form.isValid && !submitting) : true

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      <CreateGameHeader />

      <main className="scrollbar-hide flex-1 overflow-y-auto px-7 pb-8">
        <div className="flex flex-col items-center gap-3 pt-6 pb-1 text-center">
          <h1 className="font-display text-[24px] text-text-primary">New prediction game</h1>
          <p className="font-body text-[16px] text-text-secondary">
            Set up time, deadline, and ticket price
          </p>
        </div>

        <div className="flex flex-col gap-8 pt-6">
          <GameNameField
            value={form.name}
            onChange={form.setName}
            onBlur={form.blurName}
            error={form.nameError}
          />
          <PairDisplay />
          <DateTimeField
            id="prediction-time"
            label="Prediction time"
            value={form.predictionTime}
            onChange={form.setPredictionTime}
            error={form.timeError}
          />
          <DeadlineControl
            deadline={form.deadline}
            offset={form.deadlineOffset}
            min={form.deadlineMin}
            max={form.deadlineMax}
            onChange={form.setDeadlineOffset}
          />

          <div className="h-px w-full bg-border-dashed" />

          <TicketPriceField
            value={form.ticketPrice}
            onChange={form.setTicketPrice}
            onBlur={form.blurPrice}
            error={form.priceError}
          />
          <PrizePoolControl
            pool={form.pool}
            onChange={form.setPool}
            ticketPrice={Number(form.ticketPrice)}
          />

          {txError && (
            <p role="alert" className="font-mono text-[13px] text-[#E5484D]">
              {txError}
            </p>
          )}
        </div>
      </main>

      <CreateFooter
        canPay={canPay}
        onPay={handlePay}
        onBack={handleBack}
      />

      {confirmOpen && (
        <ConfirmModal
          emblem={thinkingBadge}
          title="LEAVE PAGE?"
          message="Are you sure you want to leave? Your changes will be lost"
          actions={[
            { label: 'Cancel', variant: 'inverse', onClick: cancelLeave },
            { label: 'OK', variant: 'primary', onClick: confirmLeave },
          ]}
        />
      )}
    </div>
  )
}

export default CreateGamePage
