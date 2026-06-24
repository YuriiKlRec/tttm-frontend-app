/**
 * Визначає, чи відхилив користувач транзакцію у гаманці.
 * Уніфікує перевірку для CreateGame та BuyTickets-флоу.
 */
export const isUserRejection = (err: unknown): boolean => {
  if (!(err instanceof Error)) {
    return false
  }
  return (
    err.message.includes('User declined') ||
    err.message.includes('Reject') ||
    err.message.includes('Transaction was not sent')
  )
}
