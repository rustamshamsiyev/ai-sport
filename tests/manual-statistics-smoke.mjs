// Read-only verification. Secrets come only from the ignored local environment.
import assert from 'node:assert/strict'
import { createAuthSession } from '../app/composables/authState.ts'
import { createDatabaseService } from '../app/services/databaseService.ts'
import { createStatisticsState } from '../app/composables/statisticsState.ts'

const baseUrl = process.env.NUXT_PUBLIC_API_BASE_URL
if (!baseUrl || !process.env.AUTH_SMOKE_USERNAME || !process.env.AUTH_SMOKE_PASSWORD) {
  console.error('SKIPPED: local API URL and smoke credentials required.')
  process.exitCode = 1
} else {
  let token = null
  const auth = createAuthSession({ baseUrl, storage: {
    get: () => token,
    set: (value) => { token = value },
    clear: () => { token = null }
  } })
  let state
  try {
    assert.ok(await auth.login(process.env.AUTH_SMOKE_USERNAME, process.env.AUTH_SMOKE_PASSWORD))
    assert.ok(auth.hasPermission('metadata.read'))
    const service = createDatabaseService({ baseUrl, fetcher: auth.fetcher })
    state = createStatisticsState(service, auth.hasPermission, 0)
    await state.load()
    assert.equal(state.error.value, '')
    const original = structuredClone(JSON.parse(JSON.stringify(state.data.value)))
    assert.ok(original.objects.length <= 50)
    console.log('Real backend summary:', JSON.stringify(original.summary))
    const raw = await (await auth.fetcher(`${baseUrl}/api/database/statistics`)).json()
    assert.equal(original.summary.schemas, raw.summary.schemas)
    assert.equal(original.summary.aiEnabledColumns, raw.summary.ai_enabled_columns)
    for (const pageSize of [100, 200, 50]) {
      await state.setFilters({ pageSize })
      assert.equal(state.error.value, '')
      assert.ok(state.data.value.objects.length <= pageSize)
    }
    if (original.pagination.totalPages > 1) {
      await state.setPage(2)
      assert.equal(state.data.value.pagination.page, 2)
      assert.notEqual(state.data.value.objects[0].tableId, original.objects[0].tableId)
    }
    const schema = original.schemas.find(item => item.tables + item.views > 0)
    await state.setFilters({ schemaId: schema.schemaId })
    assert.ok(state.data.value.objects.every(item => item.schemaId === schema.schemaId))
    for (const objectType of ['TABLE', 'VIEW']) {
      await state.setFilters({ schemaId: undefined, objectType })
      assert.ok(state.data.value.objects.every(item => item.objectType === objectType))
    }
    for (const aiEnabled of [true, false]) {
      await state.setFilters({ objectType: undefined, aiEnabled })
      assert.ok(state.data.value.objects.every(item => item.aiEnabled === aiEnabled))
    }
    const sample = original.objects[0]
    await state.setFilters({ aiEnabled: undefined, search: `${sample.schemaName}.${sample.tableName}` })
    assert.ok(state.data.value.objects.some(item => item.tableId === sample.tableId))
    await state.setFilters({ search: 'no-such-statistics-object-854356' })
    assert.equal(state.data.value.objects.length, 0)
    assert.deepEqual(state.data.value.summary, original.summary)
    assert.deepEqual(state.data.value.schemas, original.schemas)
    await state.load()
    assert.equal(state.error.value, '')
    console.log('PASS real statistics service/state: mapping, permissions, filters, pagination, empty and refresh. No writes or scan.')
  } catch {
    console.error('FAIL statistics verification. No credentials or backend errors are printed.')
    process.exitCode = 1
  } finally {
    state?.dispose()
    await auth.logout()
  }
}
