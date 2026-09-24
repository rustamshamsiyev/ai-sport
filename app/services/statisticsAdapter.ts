import type { DatabaseStatistics, StatisticsCounts, StatisticsParams } from '../types/statistics.ts'
import type { DatabaseSnapshot } from '../types/database.ts'

interface CountsDto {
  tables: number
  views: number
  columns: number
  primary_keys: number
  foreign_keys: number
  ai_enabled_tables: number
  ai_enabled_views: number
  ai_enabled_columns: number
}
export interface StatisticsDto {
  summary: CountsDto & { schemas: number }
  schemas: (CountsDto & { schema_id: number, schema_name: string })[]
  objects: {
    table_id: number
    schema_id: number
    schema_name: string
    table_name: string
    object_type: 'TABLE' | 'VIEW'
    business_name: string | null
    ai_enabled: boolean
    total_columns: number
    ai_enabled_columns: number
    primary_key_columns: number
    foreign_keys: number
  }[]
  pagination: { page: number, page_size: number, total: number, total_pages: number }
}
const counts = (dto: CountsDto): StatisticsCounts => ({
  tables: dto.tables, views: dto.views, columns: dto.columns, primaryKeys: dto.primary_keys, foreignKeys: dto.foreign_keys,
  aiEnabledTables: dto.ai_enabled_tables, aiEnabledViews: dto.ai_enabled_views, aiEnabledColumns: dto.ai_enabled_columns
})
export function mapStatistics(dto: StatisticsDto): DatabaseStatistics {
  return {
    summary: { ...counts(dto.summary), schemas: dto.summary.schemas },
    schemas: dto.schemas.map(schema => ({ ...counts(schema), schemaId: String(schema.schema_id), schemaName: schema.schema_name })),
    objects: dto.objects.map(object => ({
      tableId: String(object.table_id), schemaId: String(object.schema_id), schemaName: object.schema_name,
      tableName: object.table_name, objectType: object.object_type, businessName: object.business_name,
      aiEnabled: object.ai_enabled, totalColumns: object.total_columns, aiEnabledColumns: object.ai_enabled_columns,
      primaryKeyColumns: object.primary_key_columns, foreignKeys: object.foreign_keys
    })),
    pagination: { page: dto.pagination.page, pageSize: dto.pagination.page_size, total: dto.pagination.total, totalPages: dto.pagination.total_pages }
  }
}
export function statisticsQuery(params: StatisticsParams = {}) {
  const query = new URLSearchParams({ page: String(params.page ?? 1), page_size: String(params.pageSize ?? 50) })
  if (params.schemaId) query.set('schema_id', params.schemaId)
  if (params.objectType) query.set('object_type', params.objectType)
  if (params.aiEnabled !== undefined) query.set('ai_enabled', String(params.aiEnabled))
  if (params.search?.trim()) query.set('search', params.search.trim())
  return query
}

// Only the explicit mock adapter calls this. Real statistics are never derived in the browser.
export function mockStatistics(snapshot: DatabaseSnapshot, params: StatisticsParams = {}): DatabaseStatistics {
  const objects = snapshot.objects.map(object => ({
    tableId: object.id, schemaId: object.schema, schemaName: object.schema, tableName: object.technicalName,
    objectType: object.objectType, businessName: object.businessName || null, aiEnabled: object.aiEnabled,
    totalColumns: object.columnCount ?? object.columns.length,
    aiEnabledColumns: object.columns.filter(column => column.aiEnabled).length,
    primaryKeyColumns: object.primaryKeyCount ?? object.columns.filter(column => column.primaryKey).length,
    foreignKeys: object.foreignKeyCount ?? object.columns.filter(column => column.isForeignKey || column.foreignKey).length
  }))
  const aggregate = (items: typeof objects): StatisticsCounts => ({
    tables: items.filter(item => item.objectType === 'TABLE').length,
    views: items.filter(item => item.objectType === 'VIEW').length,
    columns: items.reduce((sum, item) => sum + item.totalColumns, 0),
    primaryKeys: items.reduce((sum, item) => sum + item.primaryKeyColumns, 0),
    foreignKeys: items.reduce((sum, item) => sum + item.foreignKeys, 0),
    aiEnabledTables: items.filter(item => item.objectType === 'TABLE' && item.aiEnabled).length,
    aiEnabledViews: items.filter(item => item.objectType === 'VIEW' && item.aiEnabled).length,
    aiEnabledColumns: items.reduce((sum, item) => sum + item.aiEnabledColumns, 0)
  })
  const search = params.search?.trim().toLocaleLowerCase() ?? ''
  const filtered = objects.filter(item => (!params.schemaId || item.schemaId === params.schemaId)
    && (!params.objectType || item.objectType === params.objectType)
    && (params.aiEnabled === undefined || item.aiEnabled === params.aiEnabled)
    && (`${item.schemaName}.${item.tableName}`.toLocaleLowerCase().includes(search) || item.businessName?.toLocaleLowerCase().includes(search)))
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  return {
    summary: { ...aggregate(objects), schemas: snapshot.schemas.length },
    schemas: snapshot.schemas.map(schema => ({ ...aggregate(objects.filter(object => object.schemaId === schema.name)), schemaId: schema.name, schemaName: schema.name })),
    objects: filtered.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) }
  }
}
