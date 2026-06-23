import type { FC } from 'react'
import { PredictionButton } from '../ui/PredictionButton'

/** Пропси підвалу сторінки створення гри. */
interface CreateFooterProps {
  /** Чи дозволено оплату (форма валідна). */
  canPay: boolean
  /** Обробник «Pay for contract creation». */
  onPay: () => void
  /** Обробник «Go back». */
  onBack: () => void
}

/**
 * Фіксований підвал: підказка про разову комісію, CTA оплати (disabled поки
 * форма невалідна) та текст-кнопка «Go back». Враховує safe-area знизу.
 */
export const CreateFooter: FC<CreateFooterProps> = ({ canPay, onPay, onBack }) => (
  <footer
    className="relative z-20 flex flex-col items-center gap-4 border-t border-border-dashed bg-surface px-8 py-4"
    style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 1rem)' }}
  >
    <p className="text-center font-body text-[15px] text-text-secondary">
      Requires a one-time creation fee
    </p>
    <PredictionButton label="Pay for contract creation" onClick={onPay} disabled={!canPay} />
    <button
      type="button"
      onClick={onBack}
      className="font-mono text-[15px] font-bold text-text-focus focus:outline-none"
    >
      Go back
    </button>
  </footer>
)
