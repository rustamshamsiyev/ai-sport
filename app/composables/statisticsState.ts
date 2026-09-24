import { ref } from 'vue'
import type { DatabaseService } from '../types/database.ts'
import type { DatabaseStatistics, StatisticsParams } from '../types/statistics.ts'
import { databaseErrorMessage } from '../services/databaseService.ts'

export function createStatisticsState(service: Pick<DatabaseService, 'getStatistics'>, hasPermission: (permission: string) => boolean, debounceMs = 300) {
  const data = ref<DatabaseStatistics | null>(null)
  const params = ref<StatisticsParams>({ page: 1, pageSize: 50 })
  const loading = ref(false)
  const error = ref('')
  let version = 0
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { key: string, promise: Promise<void> } | undefined
  function invalidate() {
    clearTimeout(timer)
    timer = undefined
    ++version
    pending = undefined
    loading.value = false
  }
  function load(): Promise<void> {
    if (disposed) return Promise.resolve()
    if (!hasPermission('metadata.read')) {
      invalidate()
      data.value = null
      error.value = 'Ushbu amal uchun ruxsatingiz yo\'q.'
      return Promise.resolve()
    }
    clearTimeout(timer)
    timer = undefined
    const snapshot = { ...params.value }
    const key = JSON.stringify(snapshot)
    if (pending?.key === key) return pending.promise
    const current = ++version
    loading.value = true
    error.value = ''
    const promise = (async () => {
      try {
        const result = await service.getStatistics(snapshot)
        if (!disposed && current === version) data.value = result
      } catch (cause) {
        if (!disposed && current === version) error.value = databaseErrorMessage(cause)
      } finally {
        if (!disposed && current === version) {
          loading.value = false
          pending = undefined
        }
      }
    })()
    pending = { key, promise }
    return promise
  }
  function setFilters(patch: Omit<StatisticsParams, 'page'>) {
    const next = { ...params.value, ...patch, page: 1 }
    if (JSON.stringify(next) === JSON.stringify(params.value)) return Promise.resolve()
    invalidate()
    params.value = next
    return load()
  }
  function setSearch(search: string) {
    if (disposed || search === (params.value.search ?? '')) return
    invalidate() // In-flight results are stale as soon as the user types, not after debounce.
    params.value = { ...params.value, search, page: 1 }
    loading.value = true
    timer = setTimeout(load, debounceMs)
  }
  function setPage(page: number) {
    if (!Number.isInteger(page) || page < 1 || page === params.value.page || (data.value && page > data.value.pagination.totalPages)) return Promise.resolve()
    invalidate()
    params.value = { ...params.value, page }
    return load()
  }
  function dispose() {
    disposed = true
    invalidate()
  }
  return { data, params, loading, error, load, setFilters, setSearch, setPage, dispose }
}
