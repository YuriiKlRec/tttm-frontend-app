/**
 * Єдина точка інтеграції з Amplitude (Analytics + Session Replay, EU zone).
 *
 * Ключова умова: БЕЗ VITE_AMPLITUDE_API_KEY SDK взагалі не вантажиться —
 * ні ініціалізації, ні мережевих запитів, ні окремого чанка в бандлі. Тому
 * '@amplitude/unified' імпортується ЛИШЕ динамічно, всередині initAnalytics,
 * і тільки після перевірки ключа. Прямий імпорт '@amplitude/unified' поза
 * цим файлом заборонений — всі компоненти працюють через trackEvent /
 * identifyPlayer / resetAnalytics.
 *
 * Аналітика повністю fire-and-forget: жоден виклик SDK не await-иться у
 * бізнес-логіці, будь-яка помилка SDK гаситься try/catch і ніколи не впливає
 * на UX застосунку.
 */

import { retrieveLaunchParams } from '@telegram-apps/sdk';
import { env } from '../config/env';
import { getStoredTgUserId } from './token-storage';

// ─────────────────────────────────────────
// Типи
// ─────────────────────────────────────────

/** Мінімальний профіль користувача, потрібний для identify. */
export interface AnalyticsUser {
  id: string;
  nickname: string;
  language?: string;
  /** Роль користувача ('player' | 'partner' | 'admin') — підмішується у super property 'role'. */
  role?: string;
  /** Telegram user.id (не БД-id) — підмішується у super property 'telegram_user_id'. */
  tgUserId?: string;
}

/** Тип динамічно завантаженого модуля SDK (лише для внутрішнього використання). */
type AmplitudeModule = typeof import('@amplitude/unified');

/** Ключі «super properties», що підмішуються до кожної події. */
type SuperPropertyKey =
  | 'app_language'
  | 'platform'
  | 'app_env'
  | 'telegram_user_id'
  | 'role'
  | 'app_version';

/** Одна подія, відкладена до завершення ініціалізації SDK. */
interface BufferedEvent {
  name: string;
  props?: Record<string, unknown>;
}

// ─────────────────────────────────────────
// Module-level стан (синглтон на весь час життя застосунку)
// ─────────────────────────────────────────

/** Захист від повторного запуску initAnalytics (напр. StrictMode подвійний mount). */
let initStarted = false;
/** true — SDK назавжди вимкнено (нема ключа, SSR-контекст або помилка ініціалізації). */
let disabled = false;
/** true — initAll() завершився успішно, можна викликати SDK напряму. */
let ready = false;
/** Посилання на динамічно завантажений модуль SDK — доступне лише після ready. */
let amplitudeModule: AmplitudeModule | null = null;

/** Події, викликані до завершення init — флашаться одразу після нього. */
let eventBuffer: BufferedEvent[] = [];
/** Останній identify-виклик, що прийшов до завершення init. */
let pendingIdentify: AnalyticsUser | null = null;

/**
 * Визначає платформу запуску: 'telegram-webapp' всередині Telegram Mini App,
 * інакше — звичайний браузер. retrieveLaunchParams кидає помилку поза
 * Telegram-оточенням (той самий патерн, що і в AuthProvider/I18nProvider).
 */
function detectPlatform(): 'telegram-webapp' | 'browser' {
  try {
    retrieveLaunchParams();
    return 'telegram-webapp';
  } catch {
    return 'browser';
  }
}

/**
 * Super properties, що підмішуються до кожної події. telegram_user_id/role
 * заповнюються в identifyPlayer (єдине місце, де відомий поточний user —
 * AuthProvider), app_version — статично з env.appVersion при старті.
 */
let superProperties: Record<SuperPropertyKey, string> = {
  app_language: '',
  platform: detectPlatform(),
  app_env: env.tonNetwork,
  telegram_user_id: '',
  role: '',
  app_version: env.appVersion,
};

/** Оновлює одну з super properties (напр. app_language при зміні мови в I18nProvider). */
export function setSuperProperty(key: SuperPropertyKey, value: string): void {
  superProperties = { ...superProperties, [key]: value };
}

// ─────────────────────────────────────────
// Внутрішні helpers
// ─────────────────────────────────────────

/** Реальна відправка події в SDK (лише коли ready). Ніколи не кидає. */
function sendEvent(name: string, props?: Record<string, unknown>): void {
  try {
    amplitudeModule?.track(name, { ...superProperties, ...props });
  } catch (err) {
    console.warn('[analytics] track failed:', err);
  }
}

/** Реальний identify-виклик у SDK (лише коли ready). Ніколи не кидає. */
function sendIdentify(user: AnalyticsUser): void {
  if (!amplitudeModule) return;
  try {
    amplitudeModule.setUserId(user.id);
    const identifyEvent = new amplitudeModule.Identify();
    identifyEvent.set('nickname', user.nickname);
    if (user.language) identifyEvent.set('language', user.language);
    // tg_user_id — лише з token-storage, ЖОДНИХ токенів/секретів у properties
    const tgUserId = getStoredTgUserId();
    if (tgUserId) identifyEvent.set('tg_user_id', tgUserId);
    amplitudeModule.identify(identifyEvent);
  } catch (err) {
    console.warn('[analytics] identify failed:', err);
  }
}

/** Флашить буфер подій та відкладений identify одразу після завершення init. */
function flushBuffer(): void {
  if (pendingIdentify) {
    sendIdentify(pendingIdentify);
    pendingIdentify = null;
  }
  const buffered = eventBuffer;
  eventBuffer = [];
  for (const { name, props } of buffered) {
    sendEvent(name, props);
  }
}

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

/**
 * Ініціалізує Amplitude (analytics + session replay) рівно один раз за життя
 * застосунку. Без env.amplitudeApiKey — тихий no-op назавжди: SDK не
 * завантажується взагалі (ні мережі, ні окремого чанка при реальному запуску).
 */
export function initAnalytics(): void {
  if (initStarted) return;
  initStarted = true;

  // Захист для SSR/нестандартних оточень — цей SPA завжди client-side,
  // але зайва перевірка нічого не коштує.
  if (typeof window === 'undefined') {
    disabled = true;
    return;
  }

  if (!env.amplitudeApiKey) {
    disabled = true;
    return;
  }

  const apiKey = env.amplitudeApiKey;

  void (async (): Promise<void> => {
    try {
      const amplitude = await import('@amplitude/unified');
      amplitudeModule = amplitude;
      await amplitude.initAll(apiKey, {
        serverZone: 'EU',
        analytics: { autocapture: true },
        sessionReplay: { sampleRate: 1 },
      });
      ready = true;
      flushBuffer();
    } catch (err) {
      console.warn('[analytics] init failed:', err);
      disabled = true;
    }
  })();
}

/**
 * Трекає подію (snake_case назва зі спеки). До завершення init події
 * складаються в буфер і флашаться одразу після нього. Без ключа — no-op.
 * Super properties підмішуються автоматично.
 */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (disabled) return;
  if (!ready) {
    eventBuffer.push({ name, props });
    return;
  }
  sendEvent(name, props);
}

/**
 * Ідентифікує поточного гравця: setUserId + user properties (nickname,
 * language, tg_user_id — якщо є в token-storage). Без ключа — no-op.
 * До завершення init запам'ятовує лише ОСТАННІЙ виклик і застосовує його
 * одразу після ready.
 *
 * Окремо (незалежно від disabled/ready — це лише оновлення локального
 * стану, SDK не чіпаємо) оновлює super properties telegram_user_id/role,
 * щоб вони підмішувались у всі наступні trackEvent, а не лише в identify.
 */
export function identifyPlayer(user: AnalyticsUser): void {
  if (user.tgUserId) setSuperProperty('telegram_user_id', user.tgUserId);
  if (user.role) setSuperProperty('role', user.role);

  if (disabled) return;
  if (!ready) {
    pendingIdentify = user;
    return;
  }
  sendIdentify(user);
}

/**
 * Повний скид аналітичної сесії (новий deviceId/userId) — викликати в точці
 * повного wipe сесії застосунку (зміна tg-акаунта в AuthProvider). Без
 * ключа або до завершення init — no-op (нема що скидати).
 */
export function resetAnalytics(): void {
  if (disabled || !ready) return;
  try {
    amplitudeModule?.reset();
  } catch (err) {
    console.warn('[analytics] reset failed:', err);
  }
}
