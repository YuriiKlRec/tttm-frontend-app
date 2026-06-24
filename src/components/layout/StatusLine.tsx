import type { FC } from 'react'
import { useLiveStore } from '../../store/liveStore'

/** Рядок статусу: Live-індикатор та кількість користувачів онлайн. */
export const StatusLine: FC = () => {
  // Примітивні селектори — не створюють нових обʼєктів, безпечні для перерендеру
  const connectedUsers = useLiveStore((s) => s.connectedUsers)
  const socketConnected = useLiveStore((s) => s.socketConnected)

  return (
    <div className="mx-3 mt-3 flex items-center justify-between border border-dashed border-border-dashed bg-background px-4 py-1">
      <div className="flex items-center gap-2">
        {/* Колір індикатора: зелений при активному зʼєднанні, сірий при очікуванні */}
        <span
          className={`h-2 w-2 ${socketConnected ? 'bg-green-400' : 'bg-gray-500'}`}
          aria-hidden="true"
        />
        <span
          className={`font-mono text-[13px] font-bold ${socketConnected ? 'text-green-400' : 'text-gray-500'}`}
        >
          {socketConnected ? 'Live' : 'Connecting'}
        </span>
      </div>
      <span
        className={`font-mono text-[13px] font-bold ${socketConnected ? 'text-text-success' : 'text-gray-500'}`}
      >
        {connectedUsers} USERS ONLINE
      </span>
    </div>
  )
}
