import { env } from '../config/env';

/** Клас помилки API з HTTP-статусом. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/** Клас помилки валідації (HTTP 422). */
export class ValidationError extends ApiError {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(422, errors.join('; ') || 'Помилка валідації');
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

/** Поточний Bearer-токен, встановлюється через setToken(). */
let currentToken: string | null = null;

/** Встановити або скинути токен авторизації. */
export function setToken(token: string | null): void {
  currentToken = token;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  return headers;
}

async function parseError(response: Response): Promise<never> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 422) {
    // Бекенд повертає масив рядків або об'єкт із полем errors/message
    const raw = body as Record<string, unknown> | null;
    const messages: string[] = Array.isArray(raw)
      ? (raw as string[])
      : Array.isArray(raw?.errors)
        ? (raw.errors as string[])
        : typeof raw?.message === 'string'
          ? [raw.message]
          : ['Помилка валідації'];
    throw new ValidationError(messages);
  }

  const message =
    typeof (body as Record<string, unknown> | null)?.message === 'string'
      ? ((body as Record<string, unknown>).message as string)
      : `HTTP ${response.status}`;

  throw new ApiError(response.status, message);
}

async function request<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<T>;
}

/** HTTP GET запит до API. */
export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

/** HTTP POST запит до API з необов'язковим тілом. */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** HTTP PUT запит до API з необов'язковим тілом. */
export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
