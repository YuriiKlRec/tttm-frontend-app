import { useEffect, useRef, useState, type FC } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { TermsActions } from '../components/onboarding/TermsActions'
import { useScrollToEnd } from '../hooks/useScrollToEnd'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n/useT'
import { acceptTerms } from '../services/meApi'
import iconTimes from '../assets/icon-times.svg'

/**
 * Повноекранна угода `/terms`: шапка з заголовком і ✕, прокручуване тіло
 * з текстом EULA та панель дій. Кнопки залежать від прогресу прокрутки
 * (див. useScrollToEnd + TermsActions). Прийняття веде на `/onboarding`.
 * Якщо користувач вже прийняв умови — одразу редирект на головну.
 *
 * Режим перегляду (`?view=1`, лінк "Terms of use" зі слайда 3 онбордингу):
 * умови вже прийняті, тож редиректу на "/" немає, ✕ веде назад (navigate(-1)),
 * а панель дій показує лише кнопки прокрутки (без "Accept and Continue").
 *
 * Захист від redirect-гонки: після acceptTerms() → refreshUser() контекст
 * оновлює user.termsAccepted, компонент ре-рендериться і — без прапорця
 * `accepting` — умова редиректу нижче спрацювала б РАНІШЕ за navigate('/onboarding'),
 * кидаючи користувача на "/" замість онбордингу. `accepting` вмикається одразу
 * на початку onAccept (до await) і блокує редирект-на-головну, поки не відбудеться
 * явний navigate('/onboarding').
 */
const TermsPage: FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isViewMode = searchParams.get('view') === '1'
  const { user, refreshUser } = useAuth()
  const { t, content } = useT()
  const paragraphs = content('terms').split(/\n\s*\n/).filter(Boolean)
  const bodyRef = useRef<HTMLDivElement>(null)
  // Чи триває прийняття угоди (acceptTerms → refreshUser → navigate) — блокує
  // редирект на "/", доки не виконано явний navigate('/onboarding').
  const [accepting, setAccepting] = useState(false)
  // Всі хуки — безумовно, до будь-яких умовних return
  const { atBottom, reachedEnd, scrollToBottom, scrollToTop } = useScrollToEnd(bodyRef)

  // Поява «Accept and Continue» зменшує висоту тіла на ~висоту кнопки, тож після
  // першого досягнення низу доскролюємо решту — користувач лишається в самому
  // кінці (кнопка-перемикач стає «Scroll top»).
  useEffect(() => {
    if (reachedEnd) {
      scrollToBottom()
    }
  }, [reachedEnd, scrollToBottom])

  // Якщо умови вже прийнято — не показуємо цю сторінку (після всіх хуків),
  // окрім режиму перегляду (?view=1) — там термінально прийняті умови й очікувані,
  // і окрім моменту самого прийняття (accepting) — інакше ререндер з
  // termsAccepted=true редиректить на "/" раніше, ніж спрацює navigate('/onboarding').
  if (user?.termsAccepted && !accepting && !isViewMode) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      {/* Шапка: заголовок по центру + закриття. */}
      <header className="relative flex shrink-0 items-center justify-center border-b border-border-solid bg-background px-12 pb-4 pt-[calc(var(--app-safe-top)+1rem)]">
        <h1 className="font-body text-[15px] font-bold text-text-primary">
          {t('terms.title')}
        </h1>
        <button
          type="button"
          onClick={() => (isViewMode ? navigate(-1) : navigate('/welcome'))}
          aria-label={t('terms.closeAria')}
          className="absolute right-5 top-[calc(var(--app-safe-top)+1rem)] flex h-6 w-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <img src={iconTimes} alt="" aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>

      {/* Тіло: прокручуваний текст угоди. */}
      <div
        ref={bodyRef}
        className="scrollbar-hide flex-1 space-y-4 overflow-y-auto px-7 py-6 font-body text-[15px] text-text-secondary"
      >
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {/* Панель дій. */}
      <div className="shrink-0 border-t border-border-dashed bg-surface px-8 py-4 pb-[calc(var(--app-safe-bottom)+1rem)]">
        <TermsActions
          atBottom={atBottom}
          reachedEnd={reachedEnd}
          viewOnly={isViewMode}
          onAccept={() => {
            // accepting=true ДО await — блокує redirect-гонку (див. коментар над компонентом).
            setAccepting(true)
            // acceptTerms → refreshUser (оновлює termsAccepted у контексті) → /onboarding.
            // Якщо виникає помилка — логуємо, знімаємо accepting і не переходимо
            // (користувач може повторити спробу з тієї ж сторінки).
            void (async () => {
              try {
                await acceptTerms();
                await refreshUser();
                navigate('/onboarding');
              } catch (err: unknown) {
                console.error('[TermsPage] acceptTerms or refreshUser failed:', err);
                setAccepting(false)
              }
            })();
          }}
          onScrollBottom={scrollToBottom}
          onScrollTop={scrollToTop}
        />
      </div>
    </div>
  )
}

export default TermsPage
