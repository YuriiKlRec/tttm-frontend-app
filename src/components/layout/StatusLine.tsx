import type { FC } from 'react'

/** Рядок статусу: Live-індикатор та кількість користувачів онлайн. */
export const StatusLine: FC = () => (
  <div className="mx-3 mt-3 flex items-center justify-between border border-dashed border-border-dashed bg-background px-4 py-1">
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 bg-green-400" aria-hidden="true" />
      <span className="font-mono text-[13px] font-bold text-green-400">Live</span>
    </div>
    <span className="font-mono text-[13px] font-bold text-text-success">
      10 USERS ONLINE
    </span>
  </div>
)
