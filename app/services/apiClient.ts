export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}
export function safeApiMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'So‘rov bajarilmadi. Qayta urinib ko‘ring.'
}
export function createApiClient(options: {
  baseUrl: string
  getToken: () => string | null
  onUnauthorized: (requestToken: string) => void
  fetcher?: typeof fetch
}) {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const fetcher = options.fetcher ?? fetch
  async function perform(input: string | URL | Request, init: RequestInit = {}, authenticated = true) {
    if (!baseUrl) throw new ApiError('Backend API manzili sozlanmagan. NUXT_PUBLIC_API_BASE_URL ni kiriting.')
    const url = new URL(input instanceof Request ? input.url : String(input))
    const base = new URL(baseUrl)
    if (url.origin !== base.origin || !url.pathname.startsWith(`${base.pathname.replace(/\/$/, '')}/api/`)) throw new ApiError('API manzili mos emas.')
    const token = authenticated ? options.getToken() : null
    const headers = new Headers(init.headers)
    headers.delete('Authorization')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    let response: Response
    try {
      response = await fetcher(input, { ...init, headers, redirect: 'error', credentials: 'omit', cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(30000) })
    } catch {
      throw new ApiError('Backend API bilan aloqa o\'rnatilmadi.')
    }
    // Old requests cannot invalidate a newly logged-in session.
    if (response.status === 401 && token && token === options.getToken()) options.onUnauthorized(token)
    return response
  }
  const protectedFetch: typeof fetch = (input, init) => perform(input, init)
  async function request<T>(path: string, options: { method?: string, body?: unknown, public?: boolean } = {}): Promise<T> {
    const response = await perform(`${baseUrl}/api/${path}`, {
      method: options.method ?? 'GET',
      ...(options.body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options.body) } : {})
    }, !options.public)
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'Joriy yoki yangi parolni tekshiring.',
        401: options.public ? 'Login yoki parol noto‘g‘ri.' : 'Sessiya tugagan. Qayta kiring.',
        403: 'Ushbu amal uchun ruxsatingiz yo\'q.',
        409: 'Bu login allaqachon ishlatilmoqda.',
        422: 'Kiritilgan ma\'lumotlarni tekshiring.'
      }
      throw new ApiError(messages[response.status] ?? 'Backend so‘rovi bajarilmadi. Qayta urinib ko‘ring.', response.status)
    }
    if (response.status === 204) return undefined as T
    try {
      return await response.json() as T
    } catch {
      throw new ApiError('Backend javobi o‘qilmadi.')
    }
  }
  return { request, protectedFetch }
}
export type ApiClient = ReturnType<typeof createApiClient>
