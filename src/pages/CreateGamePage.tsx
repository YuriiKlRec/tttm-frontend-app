import { useCallback, useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
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
import thinkingBadge from '../assets/badge-face-thinking.svg'

/**
 * Сторінка «New prediction game» — окремий fullscreen-лайаут (поза AppLayout):
 * фіксована шапка та підвал, скрол-тіло з полями форми. Логіка винесена у
 * useCreateGameForm; вихід зі змінами підтверджується модалкою.
 */
const CreateGamePage: FC = () => {
  const navigate = useNavigate()
  const form = useCreateGameForm()
  // Чи показано модалку підтвердження виходу.
  const [confirmOpen, setConfirmOpen] = useState(false)

  // «Go back»: за наявності змін — спершу підтвердження, інакше вихід одразу.
  const handleBack = useCallback((): void => {
    if (form.isDirty) {
      setConfirmOpen(true)
      return
    }
    void navigate('/')
  }, [form.isDirty, navigate])

  const handlePay = useCallback((): void => {
    // MOCK: реальну TonConnect-транзакцію не інтегруємо — лише виходимо.
    void navigate('/')
  }, [navigate])

  // Скасування виходу: лишитись на сторінці.
  const cancelLeave = useCallback((): void => setConfirmOpen(false), [])

  // Підтвердження виходу: перейти на головну.
  const confirmLeave = useCallback((): void => {
    void navigate('/')
  }, [navigate])

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
        </div>
      </main>

      <CreateFooter canPay={form.isValid} onPay={handlePay} onBack={handleBack} />

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
