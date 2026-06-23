import { useAuthContext } from '../context/AuthProvider';
import type { AuthContextValue } from '../context/AuthProvider';

/**
 * Хук для доступу до стану автентифікації та методів авторизації.
 *
 * @returns {AuthContextValue} - user, tz, ready, login, refreshUser
 * @throws якщо використовується поза AuthProvider
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}
