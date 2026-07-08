import { useCallback, useEffect, useRef, useState, type FC } from 'react'
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
import { useT } from '../i18n/useT'
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
 * Затримка (мс) перед поверненням блоку підтвердження після blur поля.
 * Захищає від блимання при переході фокусу між сусідніми полями.
 */
const FOCUS_BLUR_DEBOUNCE_MS = 150

/**
 * Сторінка «New prediction game» — окремий fullscreen-лайаут (поза AppLayout):
 * фіксована шапка та підвал, скрол-тіло з полями форми. Логіка винесена у
 * useCreateGameForm; вихід зі змінами підтверджується модалкою.
 * Підтвердження форми → TonConnect-транзакція → збереження гри у БД.
 */
const CreateGamePage: FC = () => {
  const navigate = useNavigate()
  const form = useCreateGameForm()
  const { t } = useT()
  const [tonConnectUI] = useTonConnectUI()
  const address = useTonAddress()

  // Чи показано модалку підтвердження виходу.
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Помилка транзакції або API (відображається у підвалі).
  const [txError, setTxError] = useState<string | null>(null)
  // Чи виконується транзакція.
  const [submitting, setSubmitting] = useState(false)

  // Чи є фокус на якомусь полі форми — ховаємо блок підтвердження, поки
  // клавіатура відкрита (менше боротьби за екранний простір на мобільних).
  const [fieldFocused, setFieldFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Фокус на будь-якому полі всередині форми: миттєво ховаємо блок підтвердження,
  // скасувавши відкладене повернення, якщо воно було заплановане.
  const handleFormFocus = useCallback((): void => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
    setFieldFocused(true)
  }, [])

  // Втрата фокусу: повертаємо блок підтвердження з невеликою затримкою,
  // щоб перехід фокусу між сусідніми полями не викликав блимання.
  const handleFormBlur = useCallback((): void => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    blurTimerRef.current = setTimeout(() => {
      setFieldFocused(false)
      blurTimerRef.current = null
    }, FOCUS_BLUR_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

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
          // У формі поля опису немає; колонка БД NOT NULL → порожній рядок.
          description: '',
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

        // Крок 5: навігація до нової гри. replace: true — прибирає форму
        // створення з історії, щоб Back з екрана гри вів одразу в лобі,
        // а не крутив по колу назад у щойно заповнену форму (див. B1).
        void navigate(`/game/${gameResp.id}`, { replace: true })
      } catch (err) {
        // Відмова користувача від транзакції — тихо виходимо, без повідомлення.
        if (isUserRejection(err)) {
          return
        }

        if (err instanceof ValidationError) {
          setTxError(err.errors.join('; '))
          return
        }

        setTxError(err instanceof Error ? err.message : t('errors.gameCreationFailed'))
      } finally {
        setSubmitting(false)
      }
    }

    void run()
  }, [address, form, tonConnectUI, submitting, navigate, t])

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

      <main
        className="scrollbar-hide flex-1 overflow-y-auto px-7 pb-8"
        onFocus={handleFormFocus}
        onBlur={handleFormBlur}
      >
        <div className="flex flex-col items-center gap-3 pt-6 pb-1 text-center">
          <h1 className="font-display text-[24px] text-text-primary">{t('createGame.title')}</h1>
          <p className="font-body text-[16px] text-text-secondary">
            {t('createGame.subtitle')}
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
            label={t('createGame.predictionTimeLabel')}
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

      {/* Grid-rows 0fr↔1fr плавно згортає/розгортає блок підтвердження без
          вимірювання висоти в JS; при фокусі поля — 0fr (сховано), інакше 1fr. */}
      <div
        className="grid shrink-0 transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: fieldFocused ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          <CreateFooter
            canPay={canPay}
            onPay={handlePay}
            onBack={handleBack}
          />
        </div>
      </div>

      {confirmOpen && (
        <ConfirmModal
          emblem={thinkingBadge}
          title={t('createGame.leavePageTitle')}
          message={t('createGame.leavePageMessage')}
          actions={[
            { label: t('common.cancel'), variant: 'inverse', onClick: cancelLeave },
            { label: t('common.ok'), variant: 'primary', onClick: confirmLeave },
          ]}
        />
      )}
    </div>
  )
}

export default CreateGamePage
