import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDatabaseService } from '../app/services/databaseService.ts'
import { createDataCollectionState } from '../app/composables/dataCollectionState.ts'

const schema = { id: 7, schema_name: 'sport', table_count: 1101, view_count: 1 }
const source = { id: 1, name: 'ERP', db_type: 'postgresql', is_active: true, last_scan_at: null }
const table = { id: 10, schema_id: 7, table_name: 'athletes', object_type: 'TABLE', column_count: 2, primary_key_count: 1, foreign_key_count: 1, business_name: null, description: 'Athletes', ai_enabled: false }
const column = { id: 20, column_name: 'id', data_type: 'bigint', udt_name: null, is_nullable: false, is_primary_key: true, is_foreign_key: true, business_name: null, description: null, ai_enabled: true }
const scan = { schemas: 1, tables: 1101, views: 1, columns: 2202, primary_keys: 1101, foreign_keys: 5, duration_ms: 987 }
const page = (items, offset = 0, total = items.length) => ({ items, total, limit: 1000, offset })
function fixture(overrides = {}) {
  const calls = []
  const service = createDatabaseService({ baseUrl: 'http://backend.test', fetcher: async (url, options) => {
    const parsed = new URL(url)
    const path = parsed.pathname.replace('/api/database/', '')
    calls.push({ path, query: parsed.searchParams, method: options.method })
    if (overrides[path]) return overrides[path](parsed, options)
    const data = path === 'source' ? source : path === 'schemas' ? page([schema]) : path === 'tables' ? page([table]) : path.endsWith('/columns') ? page([column]) : path === 'scan' ? scan : table
    return Response.json(data)
  } })
  return { service, calls }
}

test('real API maps source, schemas, table details, columns and scan without invented metadata', async () => {
  const { service, calls } = fixture()
  assert.deepEqual(await service.getSource(), { id: '1', name: 'ERP', databaseType: 'postgresql', connectionStatus: 'unknown', schemaCount: null, tableCount: null, viewCount: null, columnCount: null, lastScanAt: null })
  assert.equal((await service.getSchemas())[0].id, '7')
  const tables = await service.getTables('7')
  assert.equal(calls.at(-1).query.get('schema_id'), '7')
  assert.equal(tables[0].schema, 'sport')
  assert.equal(tables[0].businessName, '')
  assert.equal(tables[0].aiEnabled, false)
  assert.equal(tables[0].columnCount, 2)
  assert.deepEqual(await service.getTable('10'), tables[0])
  const columns = await service.getColumns('10')
  assert.equal(columns[0].isForeignKey, true)
  assert.equal(columns[0].foreignKey, null)
  assert.equal(columns[0].nullable, false)
  assert.equal(columns[0].description, '')
  assert.deepEqual(await service.scanDatabase(), { schemas: 1, tables: 1101, views: 1, columns: 2202, primaryKeys: 1101, foreignKeys: 5, durationMs: 987 })
  assert.equal(calls.at(-1).method, 'POST')
  assert.equal(service.save, undefined)
})

test('all 1101 tables are fetched with offsets; columns and schemas also paginate', async () => {
  for (const path of ['tables', 'schemas', 'tables/10/columns']) {
    const dto = path === 'tables' ? table : path === 'schemas' ? schema : column
    const { service, calls } = fixture({ [path]: (url) => {
      const offset = Number(url.searchParams.get('offset'))
      return Response.json(page(Array.from({ length: offset ? 101 : 1000 }, (_, i) => ({ ...dto, id: offset + i + 1 })), offset, 1101))
    } })
    if (path !== 'schemas') await service.getSchemas()
    const result = path === 'tables' ? await service.getTables('7') : path === 'schemas' ? await service.getSchemas() : await service.getColumns('10')
    assert.equal(result.length, 1101)
    assert.deepEqual(calls.filter(call => call.path === path).map(call => call.query.get('offset')), ['0', '1000'])
  }
})

test('backend unavailable and HTTP failures never expose raw errors or response credentials', async () => {
  const service = createDatabaseService({ baseUrl: 'http://backend.test', fetcher: async () => {
    throw new Error('password=secret')
  } })
  await assert.rejects(service.getSource(), { message: 'Backend API bilan aloqa o\'rnatilmadi.' })
  for (const status of [409, 500, 503]) {
    const { service } = fixture({ scan: () => new Response('password=secret', { status }) })
    await assert.rejects(service.scanDatabase(), error => !error.message.includes('secret'))
  }
  await assert.rejects(createDatabaseService().getSource(), /NUXT_PUBLIC_API_BASE_URL/)
})

test('mock is explicitly enabled; false string still uses real HTTP', async () => {
  const mock = createDatabaseService({ useMockApi: 'true', delayMs: 0 })
  assert.equal((await mock.getSource()).name, 'ERP SPORT DB')
  const schemas = await mock.getSchemas()
  const tables = await mock.getTables(schemas[0].id)
  assert.ok(tables.length)
  assert.ok((await mock.getColumns(tables[0].id)).length)
  assert.equal((await mock.scanDatabase()).tables, 7)
  await assert.rejects(createDatabaseService({ useMockApi: 'false' }).getSource(), /NUXT_PUBLIC_API_BASE_URL/)
})

test('initialization loads source, schemas and first schema tables; selection loads details and columns', async () => {
  const { service, calls } = fixture()
  const state = createDataCollectionState(service)
  const pending = state.load()
  assert.equal(state.states.value.source.loading, true)
  assert.equal(state.states.value.schemas.loading, true)
  await pending
  assert.equal(state.schemaId.value, '7')
  assert.equal(state.source.value.tableCount, 1101)
  assert.equal(state.objects.value.length, 1)
  assert.equal(state.selected.value, null)
  await state.select('10')
  assert.equal(state.selected.value.columns.length, 1)
  assert.equal(state.selected.value.technicalName, 'athletes')
  assert.ok(calls.some(call => call.path === 'tables/10/columns'))
  await state.selectSchema('7')
  assert.equal(state.selected.value, null)
})

const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('late responses cannot overwrite a newer table or schema selection', async () => {
  const { service } = fixture()
  const old = deferred()
  const oldColumns = deferred()
  service.getTable = id => id === 'old' ? old.promise : Promise.resolve({ id, columns: [] })
  service.getColumns = id => id === 'old' ? oldColumns.promise : Promise.resolve([{ id: 'new-column' }])
  const state = createDataCollectionState(service)
  const pending = state.select('old')
  await state.select('new')
  old.resolve({ id: 'old', columns: [] })
  oldColumns.resolve([{ id: 'old-column' }])
  await pending
  assert.equal(state.selected.value.id, 'new')
  assert.equal(state.selected.value.columns[0].id, 'new-column')
  const oldTables = deferred()
  service.getTables = id => id === 'old' ? oldTables.promise : Promise.resolve([{ id: 'new' }])
  const previous = state.selectSchema('old')
  await state.selectSchema('new')
  oldTables.resolve([{ id: 'old' }])
  await previous
  assert.equal(state.objects.value[0].id, 'new')
})

test('scan is guarded, returns actual statistics and refreshes source, schemas, tables and selected detail', async () => {
  const gate = deferred()
  const { service, calls } = fixture({ scan: () => gate.promise })
  const state = createDataCollectionState(service)
  await state.load()
  await state.select('10')
  const pending = state.scan()
  await state.scan()
  assert.equal(state.scanning.value, true)
  assert.equal(calls.filter(call => call.path === 'scan').length, 1)
  gate.resolve(Response.json(scan))
  await pending
  assert.equal(state.scanning.value, false)
  assert.equal(state.scanResult.value.durationMs, 987)
  assert.equal(calls.filter(call => call.path === 'source').length, 2)
  assert.equal(calls.filter(call => call.path === 'schemas').length, 2)
  assert.equal(calls.filter(call => call.path === 'tables').length, 2)
  assert.equal(calls.filter(call => call.path === 'tables/10/columns').length, 2)
})

test('each request exposes safe errors and retries; scan errors preserve metadata', async () => {
  for (const [path, key] of [['source', 'source'], ['schemas', 'schemas'], ['tables', 'tables'], ['tables/10', 'details'], ['tables/10/columns', 'columns']]) {
    let failing = true
    const { service } = fixture({ [path]: () => {
      if (failing) throw new Error('secret')
      return Response.json(path === 'source' ? source : path === 'schemas' ? page([schema]) : path === 'tables' ? page([table]) : key === 'columns' ? page([column]) : table)
    } })
    const state = createDataCollectionState(service)
    await state.load()
    if (key === 'details' || key === 'columns') await state.select('10')
    assert.equal(state.states.value[key].error, 'Backend API bilan aloqa o\'rnatilmadi.')
    assert.equal(state.states.value[key].loading, false)
    failing = false
    if (key === 'details' || key === 'columns') await state.select('10')
    else await state.load()
    assert.equal(state.states.value[key].error, '')
  }
  const { service } = fixture({ scan: () => new Response('secret', { status: 503 }) })
  const state = createDataCollectionState(service)
  await state.load()
  await state.scan()
  assert.ok(state.scanError.value)
  assert.equal(state.objects.value.length, 1)
  assert.equal(state.scanResult.value, null)
  assert.equal(state.scanning.value, false)
})
