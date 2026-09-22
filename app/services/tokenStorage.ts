export interface TokenStorage { get: () => string | null, set: (token: string) => void, clear: () => void }
export function createTokenStorage(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): TokenStorage {
  const key = 'erp.access-token'
  let memory: string | null = null
  return {
    get() {
      try {
        return memory ?? storage.getItem(key)
      } catch {
        return memory
      }
    },
    set(token) {
      memory = token
      try {
        storage.setItem(key, token)
      } catch { /* Storage may be disabled; keep this page's session in memory. */ }
    },
    clear() {
      memory = null
      try {
        storage.removeItem(key)
      } catch { /* No storage access. */ }
    }
  }
}
