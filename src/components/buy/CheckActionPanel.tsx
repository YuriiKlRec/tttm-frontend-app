import type { FC } from 'react'
import { PredictionButton } from '../ui/PredictionButton'

/** Тип основної дії підвалу (визначає підпис і варіант CTA). */
export type CheckCta =
  | { kind: 'connect' }
  | { kind: 'pay' }
  | { kind: 'next' }
  | { kind: 'back' }

/** Пропси підвалу з CTA та посиланням «Add more predictions». */
interface CheckActionPanelProps {
  /** Поточна дія (залежить від контексту чека). */
  cta: CheckCta
  /** Натискання основної CTA. */
  onCta: () => void
  /** Показувати «Add more predictions» (ховаємо на success). */
  showAddMore: boolean
  /** Натискання «Add more predictions». */
  onAddMore: () => void
  /** Примітка про розбиття на чеки (над CTA), напр. "Splitted into 2 payments". */
  splitNote?: string
}

/** Підпис і варіант кольору CTA за типом дії. */
const ctaView: Record<CheckCta['kind'], { label: string; variant: 'primary' | 'inverse' }> = {
  connect: { label: 'Connect wallet', variant: 'primary' },
  pay: { label: 'Pay with wallet', variant: 'primary' },
  next: { label: 'Pay next check', variant: 'inverse' },
  back: { label: 'Back to game', variant: 'inverse' },
}

/**
 * Фіксований підвал сторінки оплати: основна CTA (контекстна) та текст-кнопка
 * «Add more predictions». Враховує safe-area знизу.
 */
export const CheckActionPanel: FC<CheckActionPanelProps> = ({
  cta,
  onCta,
  showAddMore,
  onAddMore,
  splitNote,
}) => {
  const { label, variant } = ctaView[cta.kind]

  return (
    <div
      className="flex flex-col items-center gap-4 border-t border-border-dashed bg-surface pt-4"
      style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 16px)' }}
    >
      {splitNote && (
        <p className="font-body text-[15px] text-text-secondary">{splitNote}</p>
      )}
      <div className="w-full px-8">
        <PredictionButton label={label} variant={variant} onClick={onCta} />
      </div>
      {showAddMore && (
        <button
          type="button"
          onClick={onAddMore}
          className="font-mono text-[15px] font-bold text-text-focus outline-none"
        >
          Add more predictions
        </button>
      )}
    </div>
  )
}
