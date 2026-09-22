// Opt-in: node --env-file=.env tests/manual-semantic-smoke.mjs
// Temporarily changes one table and one column business name, then restores both.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabaseService } from '../app/services/databaseService.ts'

const baseUrl = process.env.NUXT_PUBLIC_API_BASE_URL
assert.ok(baseUrl, 'Set NUXT_PUBLIC_API_BASE_URL before running the manual smoke test.')
const service = createDatabaseService({ baseUrl })
const schemas = await service.getSchemas()
let table
let column
for (const schema of schemas) {
  const tables = await service.getTables(schema.id)
  for (const candidate of tables) {
    const columns = await service.getColumns(candidate.id)
    if (columns.length) {
      table = candidate
      column = columns[0]
      break
    }
  }
  if (table) break
}
assert.ok(table && column, 'A table with columns is required.')
// Preserve original nullable DTO values exactly in a recovery record before any write.
async function rawGet(path) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/database/${path}`, { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200)
  return response.json()
}
const originalTable = await rawGet(`tables/${table.id}`)
const columnPage = await rawGet(`tables/${table.id}/columns?limit=1000`)
const originalColumn = columnPage.items.find(item => String(item.id) === column.id)
assert.ok(originalColumn)
const backupPath = join(tmpdir(), `erp-semantic-smoke-${Date.now()}.json`)
await writeFile(backupPath, JSON.stringify({ baseUrl, tableId: table.id, columnId: column.id, tableBusinessName: originalTable.business_name, columnBusinessName: originalColumn.business_name }, null, 2))
console.log(`Recovery record: ${backupPath}`)
const marker = `Frontend smoke ${Date.now()}`
let tableAttempted = false
let columnAttempted = false
try {
  tableAttempted = true
  const patchedTable = await service.updateTable(table.id, { businessName: marker })
  assert.equal(patchedTable.businessName, marker)
  assert.equal((await service.getTable(table.id)).businessName, marker)
  columnAttempted = true
  const patchedColumn = await service.updateColumn(column.id, { businessName: `${marker} column` })
  assert.equal(patchedColumn.businessName, `${marker} column`)
  assert.equal((await service.getColumns(table.id)).find(item => item.id === column.id).businessName, `${marker} column`)
  console.log(`PATCH + GET verified: table ${table.id}, column ${column.id}`)
} finally {
  // Independent cleanup attempts ensure a table failure never skips column restoration.
  const restored = await Promise.allSettled([
    tableAttempted ? service.updateTable(table.id, { businessName: originalTable.business_name }) : Promise.resolve(),
    columnAttempted ? service.updateColumn(column.id, { businessName: originalColumn.business_name }) : Promise.resolve()
  ])
  assert.ok(restored.every(result => result.status === 'fulfilled'), `Restoration failed. Use recovery record ${backupPath}`)
  const restoredTable = await rawGet(`tables/${table.id}`)
  const restoredColumns = await rawGet(`tables/${table.id}/columns?limit=1000`)
  const restoredColumn = restoredColumns.items.find(item => String(item.id) === column.id)
  for (const key of ['business_name', 'description', 'ai_enabled']) {
    assert.equal(restoredTable[key], originalTable[key])
    assert.equal(restoredColumn[key], originalColumn[key])
  }
  console.log('Original table and column semantic values restored; GET verified.')
}
