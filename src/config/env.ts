/** Типізована конфігурація з оточення Vite. */
export interface Env {
  apiBaseUrl: string;
  wsUrl: string;
  devBypassAuth: boolean;
  tonNetwork: 'testnet' | 'mainnet';
  /** Тривалість таймаута оплати у хвилинах (зворотний відлік на сторінці Buy). */
  paymentTimeoutMinutes: number;
  /** URL Telegram Mini App (використовується для deep-link генерації). */
  tgMiniAppUrl: string;
  /**
   * Ключ Amplitude Analytics (EU zone). null, якщо не задано в оточенні —
   * у цьому разі SDK аналітики взагалі не вантажиться (див. services/analytics.ts).
   */
  amplitudeApiKey: string | null;
  /**
   * Версія застосунку для super property 'app_version' в аналітиці.
   * Джерело — VITE_APP_VERSION (виставляється деплой-пайплайном), fallback —
   * версія з package.json на момент написання (не читається динамічно, щоб
   * не тягнути resolveJsonModule лише заради цього).
   */
  appVersion: string;
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4003';

const rawWsUrl = import.meta.env.VITE_WS_URL;

const rawPaymentTimeout = import.meta.env.VITE_PAYMENT_TIMEOUT_MINUTES;
const paymentTimeoutMinutes = rawPaymentTimeout ? Number(rawPaymentTimeout) : 15;

const rawAmplitudeApiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;

export const env: Env = {
  apiBaseUrl,
  /** Якщо VITE_WS_URL порожній — використовуємо apiBaseUrl як WebSocket-базу. */
  wsUrl: rawWsUrl ? rawWsUrl : apiBaseUrl,
  devBypassAuth: import.meta.env.VITE_DEV_BYPASS_AUTH === 'true',
  tonNetwork:
    import.meta.env.VITE_TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
  paymentTimeoutMinutes,
  tgMiniAppUrl:
    import.meta.env.VITE_TG_MINI_APP_URL ?? 'https://t.me/tothemoon_dev_bot/tothemoondev',
  // Порожній рядок/undefined → null (аналітика вимкнена)
  amplitudeApiKey: rawAmplitudeApiKey ? rawAmplitudeApiKey : null,
  appVersion: import.meta.env.VITE_APP_VERSION ?? '0.0.0',
};
