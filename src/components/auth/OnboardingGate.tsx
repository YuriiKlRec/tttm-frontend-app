import type { FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Лейаут-маршрут, що охороняє захищені сторінки:
 *  - Поки не готово → показуємо заглушку "Завантаження…".
 *  - Якщо user=null після ready → повідомлення про недоступність авторизації.
 *  - Якщо user не прийняв умови → редирект на /welcome.
 *  - Інакше → <Outlet /> (захищений контент).
 */
const OnboardingGate: FC = () => {
  const { user, ready } = useAuth();

  // Чекаємо завершення ініціалізації — не мигаємо контентом
  if (!ready) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <span className="font-body text-[15px] text-text-secondary">Завантаження…</span>
      </div>
    );
  }

  // Поза Telegram-оточенням і без dev-bypass — user буде null
  if (!user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background px-8">
        <p className="text-center font-body text-[15px] text-text-secondary">
          Авторизація недоступна. Відкрийте застосунок у Telegram.
        </p>
      </div>
    );
  }

  // Новий користувач — ще не пройшов онбординг
  if (!user.termsAccepted) {
    return <Navigate to="/welcome" replace />;
  }

  // Усі перевірки пройдено — рендеримо захищений контент
  return <Outlet />;
};

export default OnboardingGate;
