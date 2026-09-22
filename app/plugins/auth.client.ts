import { createAuthSession } from '~/composables/authState'
import { createTokenStorage } from '~/services/tokenStorage'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  let redirecting = false
  const auth = createAuthSession({
    baseUrl: config.public.apiBaseUrl,
    storage: createTokenStorage({
      getItem: key => window.sessionStorage.getItem(key),
      setItem: (key, value) => window.sessionStorage.setItem(key, value),
      removeItem: key => window.sessionStorage.removeItem(key)
    }),
    onSignedOut() {
      if (redirecting) return
      redirecting = true
      void Promise.resolve(navigateTo('/login', { replace: true })).finally(() => {
        redirecting = false
      })
    }
  })
  return { provide: { auth } }
})
