/** Only explicit web, email, and phone links are useful in these documents. */
export function safeLink(value: string | undefined): string | undefined {
  if (!value || /\[[^\]]*\]/.test(value)) return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? value : undefined
  } catch {
    return undefined
  }
}
