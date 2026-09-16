import { isIP } from 'node:net'

/** The verified ingress must append the real client IP. Never search left after an invalid last hop. */
export function forwardedClientAddress(header: string | null, enabled: string | undefined): string | undefined {
  if (enabled !== 'true' || !header || header.length > 4096) return undefined
  const address = header.split(',').at(-1)?.trim()
  if (!address || address.includes('%') || isIP(address) === 0) return undefined
  return address
}
