import { authRedirect } from '~/composables/authState'

export default defineNuxtRouteMiddleware(async (to) => {
  // SessionStorage is browser-only. app.vue does not SSR protected content.
  if (import.meta.server) return
  const auth = useAuth()
  if (!auth.restored.value) {
    try {
      await auth.loadCurrentUser()
    } catch { /* Safe error is shown on login with retry. */ }
  }
  const destination = authRedirect(to.path, auth.isAuthenticated.value)
  if (destination) return navigateTo(destination, { replace: true })
})
