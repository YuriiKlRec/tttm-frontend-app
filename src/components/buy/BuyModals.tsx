import type { FC } from 'react'
import { ConfirmModal } from './ConfirmModal'
import type { ActiveModal } from '../../hooks/useBuyTicketsFlow'
import badgeSad from '../../assets/badge-face-sad.svg'
import badgeThinking from '../../assets/badge-face-thinking.svg'

/** Пропси контейнера модалок сторінки оплати. */
interface BuyModalsProps {
  /** Яка модалка відкрита (або null). */
  active: ActiveModal
  /** Закрити будь-яку модалку. */
  onClose: () => void
  /** Підтвердити вихід (uncompleted order). */
  onConfirmUncompleted: () => void
}

/**
 * Рендерить активну модалку сторінки оплати (ALREADY TAKEN / UNCOMPLETED ORDER)
 * через перевикористовуваний ConfirmModal.
 */
export const BuyModals: FC<BuyModalsProps> = ({ active, onClose, onConfirmUncompleted }) => {
  if (active === 'taken') {
    return (
      <ConfirmModal
        emblem={badgeSad}
        title="ALREADY TAKEN"
        message="Another player has already paid for this prediction. Be faster next time."
        actions={[{ label: 'OK', onClick: onClose }]}
      />
    )
  }

  if (active === 'uncompleted') {
    return (
      <ConfirmModal
        emblem={badgeThinking}
        title="UNCOMPLETED ORDER"
        message="Your cancelled predictions will be discarded. Return to the game?"
        actions={[
          { label: 'Cancel', variant: 'inverse', onClick: onClose },
          { label: 'OK', onClick: onConfirmUncompleted },
        ]}
      />
    )
  }

  return null
}
