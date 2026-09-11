/**
 * Browser cookie utilities for authentication tokens & session storage.
 */

export function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === 'undefined') return
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie ? document.cookie.split('; ') : []
  const prefix = `${encodeURIComponent(name)}=`
  for (const c of cookies) {
    if (c.startsWith(prefix)) {
      return decodeURIComponent(c.substring(prefix.length))
    }
  }
  return null
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`
}
