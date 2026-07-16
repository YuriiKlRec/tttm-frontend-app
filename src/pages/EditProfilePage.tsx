import { useState, useCallback, type FC } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PredictionButton } from '../components/ui/PredictionButton'
import { NicknameField } from '../components/onboarding/NicknameField'
import { LanguageList } from '../components/onboarding/LanguageList'
import { useNicknameInput } from '../hooks/useNicknameInput'
import { useAuth } from '../hooks/useAuth'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import { useT } from '../i18n/useT'
import { updateNickname } from '../services/meApi'
import { ValidationError } from '../services/http'
import { goBackOrFallback } from '../utils/navigation'

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
  const { user, updateUser } = useAuth()
  const { t, lang, setLang, languages } = useT()
  const nickname = useNicknameInput(user?.nickname)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string>('')

  // Визначаємо звідки прийшли: якщо з онбордингу — після збереження йдемо на головну
  const fromOnboarding = (location.state as { from?: string } | null)?.from === 'onboarding'
  // Заголовок за макетом: крок онбордингу лишає свій текст, редагування з профілю — «Edit Profile»
  const title = fromOnboarding ? t('onboarding.enterNickname') : t('profile.editTitle')

  // Обробник кнопки «назад»: з онбордингу йде на головну без повернення в історію,
  // інакше повертається назад або на профіль, якщо історія порожня
  const handleBack = useCallback(() => {
    if (fromOnboarding) {
      navigate('/', { replace: true })
    } else {
      goBackOrFallback(navigate, '/profile')
    }
  }, [navigate, fromOnboarding])

  // Використовуємо кнопку «назад» Telegram з власним handler'ом
  useTelegramBackButton(handleBack)

  const handleContinue = async (): Promise<void> => {
    if (!nickname.valid || submitting) return

    setSubmitting(true)
    setServerError('')

    try {
      const updatedUser = await updateNickname(nickname.nick)
      updateUser(updatedUser)
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
      {/* Верх: заголовок, поле ніка та вибір мови — закріплені зверху (не по центру екрана). */}
      <div
        className="flex flex-col items-center gap-8 px-7"
        style={{ paddingTop: 'calc(var(--app-safe-top) + 16px)' }}
      >
        <h1 className="text-center font-display text-[24px] text-text-primary">{title}</h1>

        <div className="flex w-full flex-col items-center gap-8">
          <NicknameField
            input={nickname}
            serverError={serverError}
            description={t('onboarding.nicknameVisible')}
          />

          {/* Вибір мови інтерфейсу — список пунктів (ARIA listbox), відділений
              розділювачем-бордером від секції ніка (за макетом 1907:23303) */}
          {languages.length > 0 && (
            <>
              <div className="w-full border-t border-border-dashed" aria-hidden="true" />
              <div className="w-full">
                <p id="language-label" className="mb-3 font-mono text-[15px] text-text-primary">
                  {t('profile.language')}
                </p>
                <LanguageList
                  languages={languages}
                  value={lang}
                  onChange={setLang}
                  labelId="language-label"
                />
              </div>
            </>
          )}
        </div>
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
