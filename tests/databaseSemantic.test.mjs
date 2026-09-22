import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDatabaseService, mapSemanticPatch } from '../app/services/databaseService.ts'
import { createDataCollectionState } from '../app/composables/dataCollectionState.ts'

const tableDto = { id: 10, schema_id: 1, table_name: 'athletes', object_type: 'TABLE', column_count: 120, primary_key_count: 1, foreign_key_count: 2, business_name: 'Athletes', description: 'People', ai_enabled: true }
const columnDto = { id: 20, column_name: 'id', data_type: 'bigint', is_nullable: false, is_primary_key: true, is_foreign_key: false, business_name: 'ID', description: 'Identifier', ai_enabled: true }
const page = items => ({ items, total: items.length, offset: 0, limit: 1000 })
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function fixture(confirm = async () => false) {
  const calls = []
  const failures = new Map()
  const tables = new Map([[10, { ...tableDto }], [11, { ...tableDto, id: 11, table_name: 'coaches' }]])
  const columns = Array.from({ length: 120 }, (_, index) => ({ ...columnDto, id: index + 20, column_name: `field_${index}` }))
  let gate
  const service = createDatabaseService({ baseUrl: 'http://backend.test', fetcher: async (url, options) => {
    const path = new URL(url).pathname.replace('/api/database/', '')
    const body = options.body ? JSON.parse(options.body) : undefined
    calls.push({ path, method: options.method, body, headers: options.headers })
    if (options.method === 'PATCH') {
      if (gate) await gate
      const status = failures.get(path)
      if (status === 'network') throw new Error('credential=secret')
      if (status) return new Response('credential=secret', { status })
      const [kind, id] = path.split('/')
      const target = kind === 'tables' ? tables.get(Number(id)) : columns.find(column => column.id === Number(id))
      Object.assign(target, body)
      if (typeof target.business_name === 'string') target.business_name = target.business_name.trim()
      return Response.json(target)
    }
    if (path === 'source') return Response.json({ id: 1, name: 'ERP', db_type: 'PostgreSQL', last_scan_at: null })
    if (path === 'schemas') return Response.json(page([{ id: 1, schema_name: 'sport', table_count: 2, view_count: 0 }]))
    if (path === 'tables') return Response.json(page([...tables.values()]))
    if (path.endsWith('/columns')) return Response.json(page(columns))
    if (path === 'scan') return Response.json({ schemas: 1, tables: 2, views: 0, columns: 120, primary_keys: 1, foreign_keys: 2, duration_ms: 10 })
    return Response.json(tables.get(Number(path.split('/')[1])))
  } })
  const state = createDataCollectionState(service, confirm)
  const initialize = async () => {
    await state.load()
    await state.select('10')
  }
  const editTable = patch => state.updateSelected({ ...state.selected.value, ...patch })
  const editColumn = (id, patch) => state.updateSelected({ ...state.selected.value, columns: state.selected.value.columns.map(column => column.id === id ? { ...column, ...patch } : column) })
  return { service, state, calls, failures, initialize, editTable, editColumn, patches: () => calls.filter(call => call.method === 'PATCH'), setGate: (value) => {
    gate = value
  } }
}

test('table/column PATCH whitelist, partial fields, null clearing and false boolean mapping', async () => {
  const f = fixture()
  await f.initialize()
  const result = await f.service.updateTable('10', { businessName: ' Updated ', technicalName: 'invalid', schema: 'invalid' })
  assert.deepEqual(f.patches()[0].body, { business_name: ' Updated ' })
  assert.equal(f.patches()[0].path, 'tables/10')
  assert.equal(f.patches()[0].headers['Content-Type'], 'application/json')
  assert.equal(result.businessName, 'Updated')
  assert.equal(result.schema, 'sport')
  assert.equal(result.technicalName, 'athletes')
  const column = await f.service.updateColumn('20', { businessName: '', description: null, aiEnabled: false, dataType: 'invalid' })
  assert.deepEqual(f.patches()[1].body, { business_name: null, description: null, ai_enabled: false })
  assert.equal(f.patches()[1].path, 'columns/20')
  assert.equal(column.businessName, '')
  assert.equal(column.description, '')
  assert.equal(column.aiEnabled, false)
  assert.equal(column.dataType, 'bigint')
  assert.deepEqual(mapSemanticPatch({ description: '' }), { description: null })
  assert.throws(() => mapSemanticPatch({ aiEnabled: null }), /tekshiring/)
})

test('semantic editing tracks only changed fields and columns; reverting clears dirty state', async () => {
  const f = fixture()
  await f.initialize()
  assert.equal(f.state.dirty.value, false)
  f.editTable({ technicalName: 'tampered', schema: 'tampered', businessName: 'Edited' })
  assert.equal(f.state.selected.value.technicalName, 'athletes')
  assert.equal(f.state.selected.value.schema, 'sport')
  assert.equal(f.state.tableDirty.value, true)
  f.editColumn('20', { description: 'New description', dataType: 'tampered', primaryKey: false })
  assert.equal(f.state.selected.value.columns[0].dataType, 'bigint')
  assert.equal(f.state.selected.value.columns[0].primaryKey, true)
  assert.deepEqual(f.state.dirtyColumnIds.value, ['20'])
  assert.deepEqual(f.state.dirtyIds.value, ['10'])
  f.editTable({ businessName: 'Athletes' })
  f.editColumn('20', { description: 'Identifier' })
  assert.equal(f.state.dirty.value, false)
  await f.state.save()
  assert.equal(f.patches().length, 0)
})

test('successful Save PATCHes only changed columns and rewrites state using normalized backend responses', async () => {
  const f = fixture()
  await f.initialize()
  f.editTable({ businessName: ' Sportchilar ' })
  f.editColumn('22', { businessName: ' Person ID ' })
  f.editColumn('25', { aiEnabled: false })
  await f.state.save()
  assert.deepEqual(f.patches().map(call => [call.path, call.body]), [
    ['tables/10', { business_name: ' Sportchilar ' }],
    ['columns/22', { business_name: ' Person ID ' }],
    ['columns/25', { ai_enabled: false }]
  ])
  assert.equal(f.state.selected.value.businessName, 'Sportchilar')
  assert.equal(f.state.objects.value[0].businessName, 'Sportchilar')
  assert.equal(f.state.selected.value.columns[2].businessName, 'Person ID')
  assert.equal(f.state.selected.value.columns.length, 120)
  assert.equal(f.state.dirty.value, false)
  assert.equal(f.state.saveError.value, '')
  assert.equal(f.state.success.value, 'Semantic ma’lumotlar saqlandi.')
  await f.state.save()
  assert.equal(f.patches().length, 3)
})

for (const [status, message] of [[404, 'Metadata obyekti topilmadi.'], [422, 'Kiritilgan ma\'lumotlarni tekshiring.'], ['network', 'Backend API bilan aloqa o\'rnatilmadi.']]) {
  test(`Save ${status}: safe table/column errors, edits retained, no fake success`, async () => {
    const f = fixture()
    await f.initialize()
    f.editTable({ description: 'Changed' })
    f.editColumn('20', { description: 'Changed column' })
    f.failures.set('tables/10', status)
    f.failures.set('columns/20', status)
    await f.state.save()
    assert.ok(f.state.saveError.value.includes(message))
    assert.ok(!f.state.saveError.value.includes('secret'))
    assert.equal(f.state.tableDirty.value, true)
    assert.deepEqual(f.state.dirtyColumnIds.value, ['20'])
    assert.equal(f.state.success.value, '')
    assert.equal(f.state.saving.value, false)
  })
}

test('partial failure clears successful dirty items and retries only the failed column', async () => {
  const f = fixture()
  await f.initialize()
  f.editTable({ aiEnabled: false })
  for (const id of ['20', '21', '22']) f.editColumn(id, { description: `Updated ${id}` })
  f.failures.set('columns/21', 422)
  await f.state.save()
  assert.equal(f.state.tableDirty.value, false)
  assert.deepEqual(f.state.dirtyColumnIds.value, ['21'])
  assert.equal(f.state.success.value, '')
  assert.equal(f.state.selected.value.columns[1].description, 'Updated 21')
  f.failures.clear()
  const count = f.patches().length
  await f.state.save()
  assert.equal(f.patches().length, count + 1)
  assert.equal(f.patches().at(-1).path, 'columns/21')
  assert.equal(f.state.dirty.value, false)
})

test('table failure does not mark successfully saved columns dirty', async () => {
  const f = fixture()
  await f.initialize()
  f.editTable({ description: 'Changed' })
  f.editColumn('20', { description: 'Column saved' })
  f.failures.set('tables/10', 404)
  await f.state.save()
  assert.equal(f.state.tableDirty.value, true)
  assert.deepEqual(f.state.dirtyColumnIds.value, [])
})

test('double Save, scan, selection, navigation and edits are blocked during Save', async () => {
  const gate = deferred()
  const f = fixture()
  await f.initialize()
  f.setGate(gate.promise)
  f.editTable({ description: 'Saved once' })
  const pending = f.state.save()
  assert.equal(f.state.saving.value, true)
  assert.equal(f.state.editingDisabled.value, true)
  await f.state.save()
  await f.state.select('11')
  await f.state.selectSchema('2')
  await f.state.scan()
  assert.equal(await f.state.allowDiscard(), false)
  f.editTable({ description: 'Must not overwrite pending value' })
  assert.equal(f.state.selectedId.value, '10')
  assert.equal(f.patches().length, 1)
  gate.resolve()
  await pending
  assert.equal(f.state.selected.value.description, 'Saved once')
  assert.equal(f.state.dirty.value, false)
})

for (const action of ['table', 'schema', 'scan', 'refresh', 'navigation']) {
  test(`unsaved changes + ${action}: Cancel retains draft; Continue discards`, async () => {
    let accepted = false
    let prompts = 0
    const f = fixture(async () => {
      prompts++
      return accepted
    })
    await f.initialize()
    f.editColumn('20', { businessName: 'Unsaved' })
    const act = () => action === 'table' ? f.state.select('11') : action === 'schema' ? f.state.selectSchema('1') : action === 'scan' ? f.state.scan() : action === 'refresh' ? f.state.load() : f.state.allowDiscard()
    const count = f.calls.length
    await act()
    assert.equal(f.calls.length, count)
    assert.equal(f.state.selectedId.value, '10')
    assert.equal(f.state.selected.value.columns[0].businessName, 'Unsaved')
    assert.equal(f.state.dirty.value, true)
    accepted = true
    await act()
    assert.equal(prompts, 2)
    assert.equal(f.state.dirty.value, false)
    assert.equal(f.patches().length, 0)
    if (action === 'table') assert.equal(f.state.selectedId.value, '11')
    if (action === 'schema') assert.equal(f.state.selected.value, null)
    if (action === 'scan') assert.ok(f.calls.some(call => call.path === 'scan'))
  })
}

test('pending confirmation prevents duplicate scan and Save', async () => {
  const answer = deferred()
  const f = fixture(() => answer.promise)
  await f.initialize()
  f.editTable({ description: 'Unsaved' })
  const pending = f.state.scan()
  await f.state.scan()
  await f.state.save()
  await f.state.select('11')
  assert.equal(f.patches().length, 0)
  answer.resolve(true)
  await pending
  assert.equal(f.calls.filter(call => call.path === 'scan').length, 1)
})

test('mock semantic updates persist across GET and scan; existing save-error remains retryable', async () => {
  const service = createDatabaseService({ useMockApi: true, delayMs: 0, scenario: 'save-error' })
  const state = createDataCollectionState(service)
  await state.load()
  await state.select(state.objects.value[0].id)
  const id = state.selected.value.id
  const columnId = state.selected.value.columns[0].id
  state.updateSelected({ ...state.selected.value, businessName: 'Mock renamed', columns: state.selected.value.columns.map(column => column.id === columnId ? { ...column, description: 'Mock column' } : column) })
  await state.save()
  assert.equal(state.tableDirty.value, true)
  assert.deepEqual(state.dirtyColumnIds.value, [])
  await state.save()
  assert.equal(state.dirty.value, false)
  await state.scan()
  assert.equal((await service.getTable(id)).businessName, 'Mock renamed')
  assert.equal((await service.getColumns(id))[0].description, 'Mock column')
})
