import { computed, ref } from 'vue'
import { createApiClient, safeApiMessage } from '../services/apiClient.ts'
import { createAuthService } from '../services/authService.ts'
import type { TokenStorage } from '../services/tokenStorage.ts'
import type { AuthUser, PasswordChange, ProfilePatch } from '../types/auth.ts'

export function createAuthSession(options: { baseUrl: string, storage: TokenStorage, fetcher?: typeof fetch, onSignedOut?: () => void }) {
  const user = ref<AuthUser | null>(null)
  const pending = ref(0)
  const error = ref('')
  const restored = ref(false)
  let token = options.storage.get()
  let version = 0
  let restoring: Promise<void> | undefined
  let leaveGuard: (() => Promise<boolean>) | undefined
  let logoutPending = false
  const clear = () => {
    ++version
    token = null
    options.storage.clear()
    user.value = null
    restored.value = true
  }
  const api = createApiClient({
    baseUrl: options.baseUrl, fetcher: options.fetcher, getToken: () => token,
    onUnauthorized() {
      clear()
      error.value = 'Sessiya tugagan. Qayta kiring.'
      options.onSignedOut?.()
    }
  })
  const service = createAuthService(api)
  async function action<T>(task: () => Promise<T>) {
    pending.value++
    error.value = ''
    try {
      return await task()
    } catch (cause) {
      error.value = safeApiMessage(cause)
      throw cause
    } finally { pending.value-- }
  }
  async function login(username: string, password: string) {
    if (pending.value) return false
    clear()
    const current = version
    return action(async () => {
      const result = await service.login(username, password)
      if (current !== version) return false
      token = result.accessToken
      options.storage.set(token)
      const me = await service.getCurrentUser()
      if (current !== version) return false
      user.value = me
      restored.value = true
      return true
    })
  }
  function loadCurrentUser() {
    if (restoring) return restoring
    if (!token) {
      restored.value = true
      return Promise.resolve()
    }
    const current = version
    restoring = action(async () => {
      const me = await service.getCurrentUser()
      if (current === version) {
        user.value = me
        restored.value = true
      }
    }).finally(() => { restoring = undefined })
    return restoring
  }
  async function updateProfile(payload: ProfilePatch) {
    if (pending.value || !user.value) return false
    const current = version
    return action(async () => {
      const updated = await service.updateProfile(payload)
      if (version !== current) return false
      user.value = updated
      return true
    })
  }
  async function changePassword(payload: PasswordChange) {
    if (pending.value || !user.value) return false
    const current = version
    return action(async () => {
      await service.changePassword(payload)
      return current === version
    })
  }
  async function logout() {
    if (logoutPending) return false
    logoutPending = true
    try {
      if (leaveGuard && !(await leaveGuard())) return false
      clear()
      error.value = ''
      options.onSignedOut?.()
      return true
    } finally { logoutPending = false }
  }
  function registerLeaveGuard(guard: () => Promise<boolean>) {
    leaveGuard = guard
    return () => {
      if (leaveGuard === guard) leaveGuard = undefined
    }
  }
  const isAuthenticated = computed(() => !!user.value)
  const roles = computed(() => user.value?.roles ?? [])
  const permissions = computed(() => user.value?.permissions ?? [])
  const hasPermission = (permission: string) => permissions.value.includes(permission)
  return { user: computed(() => user.value), roles, permissions, isAuthenticated, isLoading: computed(() => pending.value > 0), error, restored,
    login, loadCurrentUser, updateProfile, changePassword, logout, hasPermission, registerLeaveGuard, fetcher: api.protectedFetch }
}

export function authRedirect(path: string, authenticated: boolean) {
  path = path.replace(/\/+$/, '') || '/'
  if (!authenticated && path !== '/login') return '/login'
  if (authenticated && path === '/login') return '/'
  return null
}
