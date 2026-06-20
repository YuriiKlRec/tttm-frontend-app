import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { PredictionButton } from '../components/ui/PredictionButton'
import { NicknameField } from '../components/onboarding/NicknameField'
import { useNicknameInput } from '../hooks/useNicknameInput'
import { topPlayerNickname } from '../mocks/profile'

/**
 * Завершальний екран онбордингу `/profile`: топ-гравець зверху, поле вводу
 * нікнейму по центру (з валідацією формату й зайнятості) та CTA «Continue»
 * унизу — активна лише за валідного ніка, веде на головну `/`.
 */
const ProfilePage: FC = () => {
  const navigate = useNavigate()
  const nickname = useNicknameInput()

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      {/* Верх: топ-гравець. */}
      <div className="absolute inset-x-7 top-[calc(var(--app-safe-top)+32px)] flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-[13px] font-bold text-text-primary">TOP PLAYER:</span>
        <span className="font-mono text-[22px] font-bold text-text-primary">{topPlayerNickname}</span>
      </div>

      {/* Центр: заголовок + поле вводу ніка. */}
      <div className="absolute inset-x-7 top-1/2 flex -translate-y-1/2 flex-col items-center gap-5">
        <h1 className="text-center font-display text-[24px] text-text-primary">
          Enter Your nickname:
        </h1>
        <NicknameField input={nickname} />
      </div>

      {/* Низ: продовження (активне лише за валідного ніка). */}
      <div className="absolute inset-x-0 bottom-0 border-t border-border-dashed bg-surface px-8 py-4 pb-[calc(var(--app-safe-bottom)+1rem)]">
        <PredictionButton
          label="Continue"
          variant="primary"
          disabled={!nickname.valid}
          onClick={() => navigate('/')}
        />
      </div>
    </div>
  )
}

export default ProfilePage
