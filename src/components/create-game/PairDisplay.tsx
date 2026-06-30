import type { FC } from 'react'
import { FieldLabel } from './FieldLabel'
import { useT } from '../../i18n/useT'
import btcIcon from '../../assets/icon-btc.svg'

/**
 * Фіксований (нередагований) блок торгової пари: BTC-іконка, «BTC/USDT»
 * та підпис «Oracle: Binance». Лише display, у формі участі не бере.
 */
export const PairDisplay: FC = () => {
  const { t } = useT()

  return (
    <div className="flex w-full flex-col gap-3">
      <FieldLabel>{t('createGame.predictionPairLabel')}</FieldLabel>
      <div className="flex w-full flex-col items-center gap-1.5 bg-[rgba(255,255,255,0.05)] py-3">
        <div className="flex items-center gap-2">
          <img src={btcIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          <span className="font-mono text-[18px] font-bold text-text-secondary">BTC/USDT</span>
        </div>
        <span className="font-body text-[12px] text-text-secondary">{t('createGame.oracleBinance')}</span>
      </div>
    </div>
  )
}
