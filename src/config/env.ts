/** Типізована конфігурація з оточення Vite. */
export interface Env {
  apiBaseUrl: string;
  wsUrl: string;
  devBypassAuth: boolean;
  tonNetwork: 'testnet' | 'mainnet';
  /** Тривалість таймаута оплати у хвилинах (зворотний відлік на сторінці Buy). */
  paymentTimeoutMinutes: number;
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4003';

const rawWsUrl = import.meta.env.VITE_WS_URL;

const rawPaymentTimeout = import.meta.env.VITE_PAYMENT_TIMEOUT_MINUTES;
const paymentTimeoutMinutes = rawPaymentTimeout ? Number(rawPaymentTimeout) : 15;

export const env: Env = {
  apiBaseUrl,
  /** Якщо VITE_WS_URL порожній — використовуємо apiBaseUrl як WebSocket-базу. */
  wsUrl: rawWsUrl ? rawWsUrl : apiBaseUrl,
  devBypassAuth: import.meta.env.VITE_DEV_BYPASS_AUTH === 'true',
  tonNetwork:
    import.meta.env.VITE_TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
  paymentTimeoutMinutes,
};
