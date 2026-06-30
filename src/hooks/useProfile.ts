/**
 * Хук useProfile — завантажує профіль поточного авторизованого користувача.
 *
 * Викликає getProfile один раз після того, як auth готовий (ready=true) і user присутній.
 * Захист від подвійного fetch у StrictMode через fetchedRef.
 *
 * @returns profile — view-модель профілю або null до завантаження
 * @returns loading — true поки fetch не завершено
 * @returns error   — true якщо fetch завершився помилкою
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { getProfile } from '../services/profileApi';
import type { Profile } from '../types/profile';

/** Результат хука useProfile. */
interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: boolean;
}

/**
 * Завантажує профіль поточного користувача після готовності auth-контексту.
 * Безпечний до StrictMode: повторний виклик ефекту пропускається через ref.
 */
export function useProfile(): UseProfileResult {
  const { user, ready } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  // fetchDone — true коли запит завершився (успіх чи помилка). loading деривуємо нижче.
  const [fetchDone, setFetchDone] = useState(false);
  const [error, setError] = useState(false);

  // Захист від повторного fetch у StrictMode (подвійний mount)
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Чекаємо ініціалізації auth і наявності користувача
    if (!ready || !user) return;

    // Захист від подвійного fetch (StrictMode)
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const load = async (): Promise<void> => {
      try {
        const data = await getProfile(user.nickname);
        setProfile(data);
      } catch {
        setError(true);
      } finally {
        setFetchDone(true);
      }
    };

    void load();
  }, [ready, user]);

  // loading: поки auth не готовий — true; готовий без user — false;
  // є user — true до завершення запиту (fetchDone).
  const loading = !ready ? true : user ? !fetchDone : false;

  return { profile, loading, error };
}
