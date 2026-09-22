import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDatabaseService } from '../app/services/mockDatabaseService.ts'

function requestFor(object) {
  return {
    id: object.id,
    businessName: object.businessName,
    description: object.description,
    aiEnabled: object.aiEnabled,
    columns: object.columns.map(({ id, businessName, description, aiEnabled }) => ({ id, businessName, description, aiEnabled }))
  }
}

test('metadata counts match schemas and objects; foreign keys resolve to fixture columns', async () => {
  const snapshot = await createDatabaseService({ delayMs: 0 }).load()
  assert.equal(snapshot.source.name, 'ERP SPORT DB')
  assert.equal(snapshot.source.databaseType, 'PostgreSQL')
  assert.deepEqual(snapshot.schemas.map(schema => schema.name), ['public', 'sport', 'sport_helper'])
  assert.equal(snapshot.source.tableCount, 7)
  assert.equal(snapshot.source.viewCount, 2)
  assert.equal(snapshot.source.columnCount, snapshot.objects.flatMap(object => object.columns).length)
  const ids = new Set(snapshot.objects.flatMap(object => object.columns.map(column => column.id)))
  for (const object of snapshot.objects) {
    assert.ok(snapshot.schemas.some(schema => schema.name === object.schema))
    for (const column of object.columns) {
      if (column.foreignKey) assert.ok(ids.has(column.foreignKey), column.foreignKey)
    }
  }
})

test('read snapshots and separate service instances cannot mutate stored metadata', async () => {
  const service = createDatabaseService({ delayMs: 0 })
  const snapshot = await service.load()
  snapshot.objects[0].columns[0].technicalName = 'modified'
  snapshot.schemas.pop()
  assert.equal((await service.load()).objects[0].columns[0].technicalName, 'id')
  assert.equal((await service.load()).schemas.length, 3)
  const request = requestFor(snapshot.objects[0])
  request.businessName = 'Session edit'
  await service.save(request)
  assert.notEqual((await createDatabaseService({ delayMs: 0 }).load()).objects[0].businessName, request.businessName)
})

test('save updates only selected business metadata and AI flags, and scan retains it', async () => {
  const service = createDatabaseService({ delayMs: 0 })
  const initial = await service.load()
  const request = requestFor(initial.objects[0])
  request.businessName = '  Updated business name  '
  request.description = '  Updated description  '
  request.aiEnabled = false
  request.columns[0].aiEnabled = false
  request.columns[0].businessName = 'Business ID'
  request.columns[0].description = 'Updated column description'
  request.technicalName = 'should-not-be-written'
  request.columns[0].dataType = 'should-not-be-written'
  const saved = await service.save(request)
  assert.equal(saved.businessName, 'Updated business name')
  assert.equal(saved.description, 'Updated description')
  assert.equal(saved.aiEnabled, false)
  assert.equal(saved.columns[0].aiEnabled, false)
  assert.equal(saved.columns[0].businessName, 'Business ID')
  assert.equal(saved.technicalName, initial.objects[0].technicalName)
  assert.equal(saved.columns[0].dataType, initial.objects[0].columns[0].dataType)
  const progress = []
  const scanned = await service.scan(status => progress.push(status.progress))
  assert.deepEqual(progress, [12, 38, 68, 92, 100])
  assert.notEqual(scanned.source.lastScanAt, initial.source.lastScanAt)
  assert.deepEqual(scanned.objects[0], saved)
  assert.deepEqual(scanned.objects.slice(1), initial.objects.slice(1))
})

test('invalid columns and excessive field lengths fail atomically', async () => {
  const service = createDatabaseService({ delayMs: 0 })
  const initial = await service.load()
  for (const change of [
    request => request.columns.pop(),
    request => request.columns.push(request.columns[0]),
    (request) => { request.columns[0].id = 'unknown' },
    (request) => { request.businessName = 'x'.repeat(151) },
    (request) => { request.columns[1].description = 'x'.repeat(1001) },
    (request) => { request.id = 'unknown' }
  ]) {
    const request = requestFor(initial.objects[0])
    change(request)
    await assert.rejects(service.save(request))
    assert.deepEqual(await service.load(), initial)
  }
})

test('save captures its request before waiting and returns an independent snapshot', async () => {
  const service = createDatabaseService({ delayMs: 1 })
  const request = requestFor((await service.load()).objects[0])
  request.businessName = 'First value'
  const pending = service.save(request)
  request.businessName = 'Changed after click'
  const saved = await pending
  assert.equal(saved.businessName, 'First value')
  saved.businessName = 'Changed return value'
  assert.equal((await service.load()).objects[0].businessName, 'First value')
})

test('load, scan and save failures are recoverable and preserve saved metadata', async () => {
  const loadService = createDatabaseService({ scenario: 'load-error', delayMs: 0 })
  await assert.rejects(loadService.load())
  assert.equal((await loadService.load()).source.tableCount, 7)
  const scanService = createDatabaseService({ scenario: 'scan-error', delayMs: 0 })
  const beforeScan = await scanService.load()
  await assert.rejects(scanService.scan(() => {}))
  assert.deepEqual(await scanService.load(), beforeScan)
  assert.equal((await scanService.scan(() => {})).source.tableCount, 7)
  const saveService = createDatabaseService({ scenario: 'save-error', delayMs: 0 })
  const beforeSave = await saveService.load()
  const request = requestFor(beforeSave.objects[0])
  request.businessName = 'Retry value'
  await assert.rejects(saveService.save(request))
  assert.deepEqual(await saveService.load(), beforeSave)
  assert.equal((await saveService.save(request)).businessName, 'Retry value')
})

test('empty dataset remains valid through a scan', async () => {
  const service = createDatabaseService({ scenario: 'empty', delayMs: 0 })
  const initial = await service.load()
  assert.equal(initial.source.lastScanAt, null)
  assert.deepEqual(initial.objects, [])
  const scanned = await service.scan(() => {})
  assert.equal(scanned.source.schemaCount, 0)
  assert.equal(scanned.source.tableCount, 0)
  assert.equal(scanned.source.columnCount, 0)
  assert.ok(scanned.source.lastScanAt)
})
