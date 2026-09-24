import test from 'node:test'
import assert from 'node:assert/strict'
import { createDatabaseService } from '../app/services/databaseService.ts'
import { mapStatistics } from '../app/services/statisticsAdapter.ts'
import { createStatisticsState } from '../app/composables/statisticsState.ts'
import { createAuthSession } from '../app/composables/authState.ts'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createSSRApp } from 'vue'

const requireNuxt = createRequire(import.meta.resolve('nuxt'))
const { parse, compileScript } = requireNuxt('@vue/compiler-sfc')
const { renderToString } = requireNuxt('@vue/server-renderer')
async function renderReport(data, objectsVisible = true) {
  const filename = fileURLToPath(new URL('../app/components/data-collection/StatisticsReport.vue', import.meta.url))
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const compiled = compileScript(descriptor, { id: 'statistics-report-test', inlineTemplate: true, fs: { fileExists: existsSync, readFile: path => readFileSync(path, 'utf8') } })
  const source = stripTypeScriptTypes(compiled.content)
  const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  return renderToString(createSSRApp(component, { data, objectsVisible }))
}

const counts = { tables: 217, views: 9, columns: 6543, primary_keys: 154, foreign_keys: 432, ai_enabled_tables: 12, ai_enabled_views: 0, ai_enabled_columns: 21 }
const fixture = () => ({
  summary: { ...counts, schemas: 7 },
  schemas: [{ ...counts, schema_id: 43, schema_name: 'sample' }],
  objects: [
    { table_id: 81, schema_id: 43, schema_name: 'sample', table_name: 'competition', object_type: 'TABLE', business_name: 'Musobaqa', ai_enabled: true, total_columns: 18, ai_enabled_columns: 4, primary_key_columns: 2, foreign_keys: 6 },
    { table_id: 82, schema_id: 43, schema_name: 'sample', table_name: 'summary_view', object_type: 'VIEW', business_name: null, ai_enabled: false, total_columns: 5, ai_enabled_columns: 0, primary_key_columns: 0, foreign_keys: 0 }
  ],
  pagination: { page: 1, page_size: 50, total: 226, total_pages: 5 }
})
const response = (body = fixture(), status = 200) => new Response(JSON.stringify(body), { status })
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { resolve, reject, promise }
}
const tick = ms => new Promise(resolve => setTimeout(resolve, ms))
function setup(fetcher = async () => response(), allowed = true, debounce = 5) {
  const requests = []
  const service = createDatabaseService({ baseUrl: 'http://test.local', fetcher: async (...args) => {
    requests.push(args)
    return fetcher(...args)
  } })
  return { service, requests, state: createStatisticsState(service, permission => allowed && permission === 'metadata.read', debounce) }
}

test('statistics maps all global, schema, object and pagination fields including null/false/zero', () => {
  const result = mapStatistics(fixture())
  assert.deepEqual(result.summary, { schemas: 7, tables: 217, views: 9, columns: 6543, primaryKeys: 154, foreignKeys: 432, aiEnabledTables: 12, aiEnabledViews: 0, aiEnabledColumns: 21 })
  const { schemas, ...globalCounts } = result.summary
  assert.equal(schemas, 7)
  assert.deepEqual(result.schemas[0], { ...globalCounts, schemaId: '43', schemaName: 'sample' })
})

test('statistics object mapping preserves TABLE/VIEW, business name, counts and nullable values', () => {
  const result = mapStatistics(fixture())
  assert.deepEqual(result.objects[0], { tableId: '81', schemaId: '43', schemaName: 'sample', tableName: 'competition', objectType: 'TABLE', businessName: 'Musobaqa', aiEnabled: true, totalColumns: 18, aiEnabledColumns: 4, primaryKeyColumns: 2, foreignKeys: 6 })
  assert.equal(result.objects[1].objectType, 'VIEW')
  assert.equal(result.objects[1].businessName, null)
  assert.equal(result.objects[1].aiEnabled, false)
  assert.equal(result.objects[1].aiEnabledColumns, 0)
  assert.deepEqual(result.pagination, { page: 1, pageSize: 50, total: 226, totalPages: 5 })
})

test('statistics query encodes all filters and false, using a single paginated GET', async () => {
  const { service, requests } = setup()
  await service.getStatistics({ schemaId: '43', objectType: 'VIEW', aiEnabled: false, search: ' sample.%_ & name ', page: 3, pageSize: 200 })
  assert.equal(requests.length, 1)
  const url = new URL(requests[0][0])
  assert.equal(url.pathname, '/api/database/statistics')
  assert.deepEqual(Object.fromEntries(url.searchParams), { page: '3', page_size: '200', schema_id: '43', object_type: 'VIEW', ai_enabled: 'false', search: 'sample.%_ & name' })
  assert.equal(requests[0][1].method, 'GET')
})

test('statistics first load is 50 objects maximum and never prefetches all pages or schemas', async () => {
  const { state, requests } = setup()
  await state.load()
  assert.equal(requests.length, 1)
  assert.equal(new URL(requests[0][0]).search, '?page=1&page_size=50')
  assert.equal(state.data.value.pagination.total, 226)
  assert.equal(state.data.value.objects.length, 2)
})

for (const [label, patch] of [['schema', { schemaId: '43' }], ['type', { objectType: 'TABLE' }], ['AI selected', { aiEnabled: true }], ['AI unselected', { aiEnabled: false }]]) {
  test(`statistics ${label} filter resets page and requests the backend`, async () => {
    const { state, requests } = setup()
    await state.load()
    await state.setPage(2)
    await state.setFilters(patch)
    assert.equal(state.params.value.page, 1)
    assert.equal(requests.length, 3)
    assert.equal(new URL(requests[2][0]).searchParams.get('page'), '1')
    for (const [key, value] of Object.entries(patch)) assert.equal(state.params.value[key], value)
  })
}

test('statistics pagination uses 50/100/200 and page changes server-side', async () => {
  const { state, requests } = setup()
  await state.load()
  await state.setPage(2)
  assert.equal(new URL(requests.at(-1)[0]).searchParams.get('page'), '2')
  for (const pageSize of [100, 200, 50]) {
    await state.setFilters({ pageSize })
    assert.equal(new URL(requests.at(-1)[0]).searchParams.get('page_size'), String(pageSize))
    assert.equal(state.params.value.page, 1)
  }
})

test('statistics search debounces, resets page and invalidates old requests immediately', async () => {
  const old = deferred()
  const { state, requests } = setup(async () => requests.length === 1 ? old.promise : response(), true, 20)
  const initial = state.load()
  state.setSearch('s')
  state.setSearch('sample')
  old.resolve(response({ ...fixture(), objects: [] }))
  await initial
  assert.equal(state.data.value, null)
  assert.equal(state.loading.value, true)
  await tick(60)
  assert.equal(requests.length, 2)
  assert.equal(new URL(requests[1][0]).searchParams.get('search'), 'sample')
  assert.equal(state.data.value.objects.length, 2)
  state.dispose()
})

test('statistics stale request cannot overwrite newer filters or loading/error state', async () => {
  const old = deferred()
  const { state, requests } = setup(async () => requests.length === 1 ? old.promise : response())
  const initial = state.load()
  await state.setFilters({ objectType: 'VIEW' })
  old.resolve(response({}, 500))
  await initial
  assert.equal(state.data.value.summary.tables, 217)
  assert.equal(state.error.value, '')
  assert.equal(state.loading.value, false)
})

test('statistics loading and duplicate load protection', async () => {
  const pending = deferred()
  const { state, requests } = setup(() => pending.promise)
  const first = state.load()
  const second = state.load()
  assert.equal(first, second)
  assert.equal(state.loading.value, true)
  assert.equal(requests.length, 1)
  pending.resolve(response())
  await first
  assert.equal(state.loading.value, false)
})

test('statistics missing metadata.read makes no request and shows safe denial', async () => {
  const { state, requests } = setup(undefined, false)
  await state.load()
  await state.setFilters({ aiEnabled: true })
  assert.equal(requests.length, 0)
  assert.equal(state.data.value, null)
  assert.match(state.error.value, /ruxsatingiz/)
})

test('statistics empty objects preserve global summary and schema rows', async () => {
  const empty = { ...fixture(), objects: [], pagination: { page: 1, page_size: 50, total: 0, total_pages: 0 } }
  const { state } = setup(async () => response(empty))
  await state.load()
  assert.equal(state.data.value.objects.length, 0)
  assert.equal(state.data.value.summary.tables, 217)
  assert.equal(state.data.value.schemas.length, 1)
})

for (const failure of [500, 422, 'network']) {
  test(`statistics ${failure} safe error and successful retry/refresh without scan`, async () => {
    let fail = true
    const { state, requests } = setup(async () => {
      if (fail && failure === 'network') throw new Error('sensitive credential stack')
      return fail ? response({ detail: 'sensitive credential stack' }, failure) : response()
    })
    await state.load()
    assert.ok(state.error.value)
    assert.doesNotMatch(state.error.value, /sensitive|credential|stack/)
    fail = false
    await state.load()
    await state.load()
    assert.equal(state.error.value, '')
    assert.equal(requests.length, 3)
    assert.ok(requests.every(([url, init]) => new URL(url).pathname === '/api/database/statistics' && init.method === 'GET'))
  })
}

test('statistics protected Bearer, 403 retains session and 401 uses existing logout', async () => {
  let token = 'isolated-test-token'
  let status = 200
  let signedOut = 0
  const auth = createAuthSession({ baseUrl: 'http://test.local', storage: {
    get: () => token,
    set: (value) => { token = value },
    clear: () => { token = null }
  }, onSignedOut: () => { signedOut++ }, fetcher: async (url, init) => {
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer isolated-test-token')
    if (String(url).endsWith('/auth/me')) return response({ id: 1, username: 'test', full_name: null, auth_source: 'LOCAL', roles: ['VIEWER'], permissions: ['metadata.read'] })
    return response(fixture(), status)
  } })
  await auth.loadCurrentUser()
  const service = createDatabaseService({ baseUrl: 'http://test.local', fetcher: auth.fetcher })
  const state = createStatisticsState(service, auth.hasPermission)
  await state.load()
  assert.ok(state.data.value)
  status = 403
  await state.load()
  assert.match(state.error.value, /ruxsatingiz/)
  assert.equal(auth.isAuthenticated.value, true)
  assert.ok(token)
  status = 401
  await state.load()
  assert.equal(token, null)
  assert.equal(auth.isAuthenticated.value, false)
  assert.equal(signedOut, 1)
})

test('statistics dispose cancels search timer and ignores pending results', async () => {
  const pending = deferred()
  const { state, requests } = setup(() => pending.promise)
  const load = state.load()
  state.setSearch('x')
  state.dispose()
  pending.resolve(response())
  await load
  await tick(20)
  assert.equal(state.data.value, null)
  assert.equal(requests.length, 1)
})

test('statistics explicit mock mode works offline and filters preserve global counts', async () => {
  const service = createDatabaseService({ useMockApi: true, delayMs: 0, fetcher: async () => {
    throw new Error('Network forbidden')
  } })
  const all = await service.getStatistics()
  assert.ok(all.objects.length)
  const selected = await service.getStatistics({ aiEnabled: false, objectType: 'TABLE', search: all.objects[0].schemaName, pageSize: 100 })
  assert.deepEqual(selected.summary, all.summary)
  assert.ok(selected.objects.every(item => !item.aiEnabled && item.objectType === 'TABLE'))
  const empty = await service.getStatistics({ search: 'no-such-object-934857' })
  assert.equal(empty.objects.length, 0)
  assert.deepEqual(empty.schemas, all.schemas)
})

test('statistics report renders dynamic summary and AI counts, schemas and TABLE/VIEW object rows', async () => {
  const html = await renderReport(mapStatistics(fixture()))
  for (const text of ['Sxemalar', 'Jadvallar', 'Viewlar', 'Ustunlar', 'Primary Key', 'Foreign Key', 'AI uchun: 12', 'AI uchun: 0', 'AI uchun: 21', 'sample', 'competition', 'summary_view', 'TABLE', 'VIEW', 'Musobaqa', '>18<', '>4<', '>2<', '>6<', 'Ha', 'Yo‘q']) assert.ok(html.includes(text), text)
  assert.ok(html.includes(new Intl.NumberFormat('uz-UZ').format(6543)))
  const other = fixture()
  other.summary.tables = 789
  assert.ok((await renderReport(mapStatistics(other))).includes('>789<'))
})

test('statistics report renders empty state while keeping global summaries and hides stale objects', async () => {
  const data = mapStatistics({ ...fixture(), objects: [] })
  const html = await renderReport(data)
  assert.match(html, /Ma&#39;lumot topilmadi/)
  assert.match(html, /Sxemalar statistikasi/)
  assert.match(html, /217/)
  const loading = await renderReport(mapStatistics(fixture()), false)
  assert.doesNotMatch(loading, /summary_view/)
  assert.match(loading, /Natija yangilanmoqda/)
})
