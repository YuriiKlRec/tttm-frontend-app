import { env } from '../config/env'

/** Глибоке посилання на Mini App з id гри у startapp (читається через startParam). */
export function gameDeepLink(gameId: string): string {
  return `${env.tgMiniAppUrl}?startapp=${gameId}`
}
