import type { FC } from 'react'
import { ConfirmModal } from './ConfirmModal'
import { useT } from '../../i18n/useT'
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
  const { t } = useT()

  if (active === 'taken') {
    return (
      <ConfirmModal
        emblem={badgeSad}
        title={t('buy.takenTitle')}
        message={t('buy.takenMessage')}
        actions={[{ label: t('common.ok'), onClick: onClose }]}
      />
    )
  }

  if (active === 'uncompleted') {
    return (
      <ConfirmModal
        emblem={badgeThinking}
        title={t('buy.uncompletedTitle')}
        message={t('buy.uncompletedMessage')}
        actions={[
          { label: t('common.cancel'), variant: 'inverse', onClick: onClose },
          { label: t('common.ok'), onClick: onConfirmUncompleted },
        ]}
      />
    )
  }

  return null
}
