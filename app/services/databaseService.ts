import type { DatabaseColumn, DatabaseObject, DatabaseSchema, DatabaseService, DataSource, MockScenario, ScanResult, SemanticPatch } from '../types/database.ts'
import { mapStatistics, mockStatistics, statisticsQuery } from './statisticsAdapter.ts'
import type { StatisticsDto } from './statisticsAdapter.ts'

// DTOs follow the FastAPI OpenAPI contract; only these adapters know snake_case.
interface SemanticDto { business_name: string | null, description: string | null, ai_enabled: boolean }
interface SourceDto { id: number, name: string, db_type: string, last_scan_at: string | null }
interface SchemaDto { id: number, schema_name: string, table_count: number, view_count: number }
interface TableDto extends SemanticDto { id: number, schema_id: number, table_name: string, object_type: string, column_count: number, primary_key_count: number, foreign_key_count: number }
interface ColumnDto extends SemanticDto { id: number, column_name: string, data_type: string | null, udt_name: string | null, is_nullable: boolean, is_primary_key: boolean, is_foreign_key: boolean }
interface ScanDto { schemas: number, tables: number, views: number, columns: number, primary_keys: number, foreign_keys: number, duration_ms: number }
interface Page<T> { items: T[], total: number, limit: number, offset: number }
export interface ServiceOptions { baseUrl?: string, useMockApi?: boolean | string, scenario?: MockScenario, delayMs?: number, fetcher?: typeof fetch }
const semantic = (dto: SemanticDto) => ({ businessName: dto.business_name ?? '', description: dto.description ?? '', aiEnabled: dto.ai_enabled })
export function mapSource(dto: SourceDto): DataSource {
  return { id: String(dto.id), name: dto.name, databaseType: dto.db_type, connectionStatus: 'unknown', schemaCount: null, tableCount: null, viewCount: null, columnCount: null, lastScanAt: dto.last_scan_at }
}
export function mapTable(dto: TableDto, schema: string): DatabaseObject {
  if (dto.object_type !== 'TABLE' && dto.object_type !== 'VIEW') throw new Error('Unsupported object type')
  return { id: String(dto.id), schema, technicalName: dto.table_name, objectType: dto.object_type, columnCount: dto.column_count, primaryKeyCount: dto.primary_key_count, foreignKeyCount: dto.foreign_key_count, columns: [], ...semantic(dto) }
}
export function mapColumn(dto: ColumnDto): DatabaseColumn {
  return { id: String(dto.id), technicalName: dto.column_name, dataType: dto.data_type ?? dto.udt_name ?? '—', nullable: dto.is_nullable, primaryKey: dto.is_primary_key, isForeignKey: dto.is_foreign_key, foreignKey: null, ...semantic(dto) }
}
export function mapScan(dto: ScanDto): ScanResult {
  return { schemas: dto.schemas, tables: dto.tables, views: dto.views, columns: dto.columns, primaryKeys: dto.primary_keys, foreignKeys: dto.foreign_keys, durationMs: dto.duration_ms }
}
export class DatabaseApiError extends Error {}
export function mapSemanticPatch(payload: SemanticPatch) {
  const dto: { business_name?: string | null, description?: string | null, ai_enabled?: boolean } = {}
  if (payload.businessName !== undefined) dto.business_name = payload.businessName === '' ? null : payload.businessName
  if (payload.description !== undefined) dto.description = payload.description === '' ? null : payload.description
  if (payload.aiEnabled !== undefined) {
    if (typeof payload.aiEnabled !== 'boolean') throw new DatabaseApiError('Kiritilgan ma\'lumotlarni tekshiring.')
    dto.ai_enabled = payload.aiEnabled
  }
  return dto
}
export function databaseErrorMessage(error: unknown): string {
  return error instanceof DatabaseApiError ? error.message : 'Metadata yuklanmadi. Qayta urinib ko‘ring.'
}
export function createDatabaseService(options: ServiceOptions = {}): DatabaseService {
  if (options.useMockApi === true || options.useMockApi === 'true') return createMockAdapter(options)
  const fetcher = options.fetcher ?? fetch
  let schemas: DatabaseSchema[] = []
  let scanPending: Promise<ScanResult> | undefined
  async function request<T>(path: string, method = 'GET', body?: ReturnType<typeof mapSemanticPatch>): Promise<T> {
    if (!options.baseUrl?.trim()) throw new DatabaseApiError('Backend API manzili sozlanmagan. NUXT_PUBLIC_API_BASE_URL ni kiriting.')
    let response: Response
    try {
      response = await fetcher(`${options.baseUrl.replace(/\/$/, '')}/api/database/${path}`, {
        method,
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(method === 'POST' ? 300000 : 30000)
      })
    } catch {
      throw new DatabaseApiError('Backend API bilan aloqa o\'rnatilmadi.')
    }
    if (!response.ok) {
      if (response.status === 401) throw new DatabaseApiError('Sessiya tugagan. Qayta kiring.')
      if (response.status === 403) throw new DatabaseApiError('Ushbu amal uchun ruxsatingiz yo\'q.')
      if (response.status === 404) throw new DatabaseApiError('Metadata obyekti topilmadi.')
      if (response.status === 422) throw new DatabaseApiError('Kiritilgan ma\'lumotlarni tekshiring.')
      throw new DatabaseApiError(response.status === 409 ? 'Database scan allaqachon bajarilmoqda. Keyinroq qayta urinib ko‘ring.' : response.status === 503 ? 'Backend xizmati vaqtincha mavjud emas. Qayta urinib ko‘ring.' : 'Backend so‘rovi bajarilmadi. Qayta urinib ko‘ring.')
    }
    try {
      return await response.json() as T
    } catch {
      throw new DatabaseApiError('Backend javobi o‘qilmadi. Qayta urinib ko‘ring.')
    }
  }
  async function list<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const items: T[] = []
    while (true) {
      const query = new URLSearchParams({ ...params, limit: '1000', offset: String(items.length) })
      const page = await request<Page<T>>(`${path}?${query}`)
      if (!Array.isArray(page.items) || !Number.isInteger(page.total) || page.offset !== items.length || (!page.items.length && items.length < page.total)) throw new DatabaseApiError('Backend ro‘yxat formati mos emas.')
      items.push(...page.items)
      if (items.length >= page.total) return items
    }
  }
  const table = (dto: TableDto) => {
    const schema = schemas.find(item => item.id === String(dto.schema_id))
    if (!schema) throw new DatabaseApiError('Table scheması topilmadi. Schema ro‘yxatini yangilang.')
    return mapTable(dto, schema.name)
  }
  return {
    getStatistics: async params => mapStatistics(await request<StatisticsDto>(`statistics?${statisticsQuery(params)}`)),
    updateTable: async (id, payload) => table(await request<TableDto>(`tables/${encodeURIComponent(id)}`, 'PATCH', mapSemanticPatch(payload))),
    updateColumn: async (id, payload) => mapColumn(await request<ColumnDto>(`columns/${encodeURIComponent(id)}`, 'PATCH', mapSemanticPatch(payload))),
    getSource: async () => mapSource(await request<SourceDto>('source')),
    async getSchemas() {
      schemas = (await list<SchemaDto>('schemas')).map(dto => ({ id: String(dto.id), name: dto.schema_name, tableCount: dto.table_count, viewCount: dto.view_count }))
      return schemas
    },
    getTables: async schemaId => (await list<TableDto>('tables', { schema_id: schemaId })).map(table),
    getTable: async tableId => table(await request<TableDto>(`tables/${encodeURIComponent(tableId)}`)),
    getColumns: async tableId => (await list<ColumnDto>(`tables/${encodeURIComponent(tableId)}/columns`)).map(mapColumn),
    scanDatabase() {
      scanPending ??= request<ScanDto>('scan', 'POST').then(mapScan).finally(() => {
        scanPending = undefined
      })
      return scanPending
    }
  }
}

function createMockAdapter(options: ServiceOptions): DatabaseService {
  // Explicit opt-in and lazy import keep fixtures out of the default data flow.
  const mock = import('./mockDatabaseService.ts').then(module => module.createDatabaseService(options))
  const load = async () => (await mock).load()
  const find = async (id: string) => {
    const object = (await load()).objects.find(item => item.id === id)
    if (!object) throw new DatabaseApiError('Obyekt topilmadi.')
    return object
  }
  const mockPatch = (payload: SemanticPatch) => {
    const dto = mapSemanticPatch(payload)
    return {
      ...(dto.business_name !== undefined ? { businessName: dto.business_name ?? '' } : {}),
      ...(dto.description !== undefined ? { description: dto.description ?? '' } : {}),
      ...(dto.ai_enabled !== undefined ? { aiEnabled: dto.ai_enabled } : {})
    }
  }
  return {
    getStatistics: async params => mockStatistics(await load(), params),
    async updateTable(id, payload) {
      const patch = mockPatch(payload)
      return (await mock).save({ ...await find(id), ...patch })
    },
    async updateColumn(id, payload) {
      const patch = mockPatch(payload)
      const object = (await load()).objects.find(item => item.columns.some(column => column.id === id))
      if (!object) throw new DatabaseApiError('Metadata obyekti topilmadi.')
      const saved = await (await mock).save({ ...object, columns: object.columns.map(column => column.id === id ? { ...column, ...patch } : column) })
      return saved.columns.find(column => column.id === id)!
    },
    getSource: async () => (await load()).source,
    getSchemas: async () => (await load()).schemas.map(schema => ({ ...schema, id: schema.name })),
    getTables: async id => (await load()).objects.filter(item => item.schema === id),
    getTable: find,
    getColumns: async id => (await find(id)).columns,
    async scanDatabase() {
      const start = Date.now()
      const result = await (await mock).scan(() => {})
      const columns = result.objects.flatMap(item => item.columns)
      return { schemas: result.schemas.length, tables: result.source.tableCount ?? 0, views: result.source.viewCount ?? 0, columns: columns.length, primaryKeys: columns.filter(item => item.primaryKey).length, foreignKeys: columns.filter(item => item.foreignKey).length, durationMs: Date.now() - start }
    }
  }
}
