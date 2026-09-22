import { createDatabaseService } from '~/services/databaseService'
import { createDataCollectionState } from './dataCollectionState'
import type { MockScenario } from '~/types/database'

export function useDataCollection(scenario: MockScenario = 'normal') {
  const config = useRuntimeConfig()
  const auth = useAuth()
  const mockMode = config.public.useMockApi === true || String(config.public.useMockApi) === 'true'
  const confirmOpen = ref(false)
  let resolveConfirmation: ((accepted: boolean) => void) | undefined
  function finishConfirmation(accepted: boolean) {
    confirmOpen.value = false
    resolveConfirmation?.(accepted)
    resolveConfirmation = undefined
  }
  const state = createDataCollectionState(createDatabaseService({ baseUrl: config.public.apiBaseUrl, useMockApi: mockMode, scenario, fetcher: auth.fetcher }), () => new Promise<boolean>((resolve) => {
    resolveConfirmation = resolve
    confirmOpen.value = true
  }), auth.hasPermission)
  const removeLeaveGuard = auth.registerLeaveGuard(state.allowDiscard)
  const toast = useToast()
  watch(state.success, (message) => {
    if (message) toast.add({ title: message, color: 'success', icon: 'i-lucide-circle-check' })
  })
  onBeforeRouteLeave(() => !auth.isAuthenticated.value || state.allowDiscard())
  function beforeUnload(event: BeforeUnloadEvent) {
    if (state.dirty.value || state.saving.value) {
      event.preventDefault()
      event.returnValue = ''
    }
  }
  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onMounted(state.load)
  onBeforeUnmount(() => {
    state.dispose()
    removeLeaveGuard()
    finishConfirmation(false)
    window.removeEventListener('beforeunload', beforeUnload)
  })
  return { ...state, mockMode, confirmOpen, finishConfirmation, hasPermission: auth.hasPermission }
}
