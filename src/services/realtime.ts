/**
 * Singleton-модуль для Socket.IO підключення.
 *
 * Один shared socket — не створюємо новий при кожному join/leave гри.
 * При відсутності токена (гостьовий режим) підключення НЕ виконується.
 *
 * Підтримувані події з сервера:
 *   game:updated, game:finalized, game:claimed — оновлення стану гри
 *   game:ticket_added                          — новий тікет у кімнаті
 *   ticket:created                             — власний тікет (user room)
 */

import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';
import { useLiveStore } from '../store/liveStore';

// ─────────────────────────────────────────
// Module-level singleton
// ─────────────────────────────────────────

/** Єдиний Socket.IO-екземпляр для всього застосунку. */
let socket: Socket | null = null;

// ─────────────────────────────────────────
// Внутрішні helpers
// ─────────────────────────────────────────

/** Підписує глобальні обробники подій real-time кімнати. */
function subscribeEvents(s: Socket): void {
  // Оновлення стану гри (три варіанти — один обробник через ingest)
  s.on('game:updated', (payload: unknown) => {
    useLiveStore.getState().ingest({ type: 'game:updated', payload });
  });

  s.on('game:finalized', (payload: unknown) => {
    useLiveStore.getState().ingest({ type: 'game:finalized', payload });
  });

  s.on('game:claimed', (payload: unknown) => {
    useLiveStore.getState().ingest({ type: 'game:claimed', payload });
  });

  // Новий тікет у грі (кімнатна подія)
  s.on('game:ticket_added', (payload: unknown) => {
    useLiveStore.getState().ingest({ type: 'game:ticket_added', payload });
  });

  // Власний тікет (user-room подія)
  s.on('ticket:created', (payload: unknown) => {
    useLiveStore.getState().ingest({ type: 'ticket:created', payload });
  });

  // Встановлюємо socketConnected=true при успішному підключенні
  s.on('connect', () => {
    useLiveStore.getState().setSocketConnected(true);
  });

  // Скидаємо socketConnected при відключенні
  s.on('disconnect', () => {
    useLiveStore.getState().setSocketConnected(false);
  });

  // Логування помилок підключення (токен не виводимо); скидаємо статус
  s.on('connect_error', (err) => {
    console.warn('[realtime] connect_error:', err.message);
    useLiveStore.getState().setSocketConnected(false);
  });

  // Оновлення глобальної статистики (кількість підключених користувачів)
  s.on('stats:updated', (d: { connectedUsers: number }) => {
    useLiveStore.getState().setConnectedUsers(d.connectedUsers);
  });
}

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

/**
 * Ініціює або перепідключає shared Socket.IO-екземпляр.
 * Якщо socket вже підключено — нічого не робить.
 *
 * @param token - access-токен БЕЗ 'Bearer' або null (гостьовий режим)
 */
export function connectRealtime(token: string | null): void {
  if (socket?.connected) return;

  // Якщо є старий непідключений socket — очищаємо
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(env.wsUrl, {
    // Гостьовий режим: не надсилаємо поле token взагалі, щоб сервер міг розрізнити гостей
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
  });

  subscribeEvents(socket);
}

/**
 * Приєднує клієнта до кімнати конкретної гри.
 * Безпечно викликати навіть до підключення — Socket.IO буферизує.
 */
export function joinGame(id: string): void {
  socket?.emit('join:game', id);
}

/**
 * Виходить з кімнати конкретної гри.
 */
export function leaveGame(id: string): void {
  socket?.emit('leave:game', id);
}

/**
 * Повністю закриває WebSocket-з'єднання.
 * Використовувати ТІЛЬКИ при логауті або завершенні сесії.
 */
export function disconnectRealtime(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
