import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { PredictionButton } from '../components/ui/PredictionButton'
import { NicknameField } from '../components/onboarding/NicknameField'
import { useNicknameInput } from '../hooks/useNicknameInput'
import { updateNickname } from '../services/meApi'
import { ValidationError } from '../services/http'

// TOP PLAYER (лідерборд) приховано до появи формули розрахунку — повернути пізніше

/**
 * Завершальний екран онбордингу `/profile`: поле вводу нікнейму по центру
 * (з клієнтською та серверною валідацією) і CTA «Continue» унизу.
 * Нік зберігається через PUT /api/me перед переходом на головну.
 */
const ProfilePage: FC = () => {
  const navigate = useNavigate()
  const nickname = useNicknameInput()
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string>('')

  const handleContinue = async (): Promise<void> => {
    if (!nickname.valid || submitting) return

    setSubmitting(true)
    setServerError('')

    try {
      await updateNickname(nickname.nick)
      navigate('/')
    } catch (err) {
      if (err instanceof ValidationError) {
        setServerError(err.errors[0] ?? 'Помилка збереження нікнейму')
      } else {
        setServerError('Не вдалось зберегти нікнейм. Спробуйте ще раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      {/* Центр: заголовок + поле вводу ніка. */}
      <div className="absolute inset-x-7 top-1/2 flex -translate-y-1/2 flex-col items-center gap-5">
        <h1 className="text-center font-display text-[24px] text-text-primary">
          Enter Your nickname:
        </h1>
        <NicknameField input={nickname} serverError={serverError} />
      </div>

      {/* Низ: продовження (активне лише за валідного ніка і поки не виконується запит). */}
      <div className="absolute inset-x-0 bottom-0 border-t border-border-dashed bg-surface px-8 py-4 pb-[calc(var(--app-safe-bottom)+1rem)]">
        <PredictionButton
          label={submitting ? 'Saving…' : 'Continue'}
          variant="primary"
          disabled={!nickname.valid || submitting}
          onClick={() => void handleContinue()}
        />
      </div>
    </div>
  )
}

export default ProfilePage
