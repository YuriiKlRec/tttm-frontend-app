/** Типізована конфігурація з оточення Vite. */
export interface Env {
  apiBaseUrl: string;
  wsUrl: string;
  devBypassAuth: boolean;
  tonNetwork: 'testnet' | 'mainnet';
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4003';

const rawWsUrl = import.meta.env.VITE_WS_URL;

export const env: Env = {
  apiBaseUrl,
  /** Якщо VITE_WS_URL порожній — використовуємо apiBaseUrl як WebSocket-базу. */
  wsUrl: rawWsUrl ? rawWsUrl : apiBaseUrl,
  devBypassAuth: import.meta.env.VITE_DEV_BYPASS_AUTH === 'true',
  tonNetwork:
    import.meta.env.VITE_TON_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
};
