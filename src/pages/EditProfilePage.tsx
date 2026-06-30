import { useState, type FC } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PredictionButton } from '../components/ui/PredictionButton'
import { NicknameField } from '../components/onboarding/NicknameField'
import { useNicknameInput } from '../hooks/useNicknameInput'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n/useT'
import { updateNickname } from '../services/meApi'
import { ValidationError } from '../services/http'

/**
 * Сторінка редагування нікнейму `/edit-profile`.
 *
 * Виконує дві ролі:
 *   1. Крок онбордингу після прийняття Terms — якщо `location.state.from === 'onboarding'`,
 *      після збереження веде на `/` (головна).
 *   2. Редагування профілю з `/profile` — після збереження повертає на `/profile`.
 *
 * Містить поле вводу нікнейму з клієнтською та серверною валідацією і CTA «Continue».
 */
const EditProfilePage: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { t, lang, setLang, languages } = useT()
  const nickname = useNicknameInput(user?.nickname)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string>('')

  // Визначаємо звідки прийшли: якщо з онбордингу — після збереження йдемо на головну
  const fromOnboarding = (location.state as { from?: string } | null)?.from === 'onboarding'

  const handleContinue = async (): Promise<void> => {
    if (!nickname.valid || submitting) return

    setSubmitting(true)
    setServerError('')

    try {
      await updateNickname(nickname.nick)
      navigate(fromOnboarding ? '/' : '/profile')
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
          {t('onboarding.enterNickname')}
        </h1>
        <NicknameField
          input={nickname}
          serverError={serverError}
          description={t('onboarding.nicknameVisible')}
        />

        {/* Вибір мови інтерфейсу */}
        {languages.length > 0 && (
          <div className="w-full">
            <label
              htmlFor="language-select"
              className="mb-1.5 block font-mono text-[12px] font-bold text-text-secondary"
            >
              {t('profile.language')}
            </label>
            <select
              id="language-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="h-12 w-full appearance-none border border-text-primary bg-[rgba(255,255,255,0.1)] px-4 font-mono text-[15px] font-bold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {languages.map((lng) => (
                <option key={lng.code} value={lng.code} className="bg-[#0b0b0b] text-text-primary">
                  {lng.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Низ: продовження (активне лише за валідного ніка і поки не виконується запит). */}
      <div className="absolute inset-x-0 bottom-0 border-t border-border-dashed bg-surface px-8 py-4 pb-[calc(var(--app-safe-bottom)+1rem)]">
        <PredictionButton
          label={submitting ? t('onboarding.saving') : t('onboarding.continue')}
          variant="primary"
          disabled={!nickname.valid || submitting}
          onClick={() => void handleContinue()}
        />
      </div>
    </div>
  )
}

export default EditProfilePage
