import type { DatabaseObjectType } from './database.ts'

export interface StatisticsCounts {
  tables: number
  views: number
  columns: number
  primaryKeys: number
  foreignKeys: number
  aiEnabledTables: number
  aiEnabledViews: number
  aiEnabledColumns: number
}
export interface SchemaStatistics extends StatisticsCounts { schemaId: string, schemaName: string }
export interface ObjectStatistics {
  tableId: string
  schemaId: string
  schemaName: string
  tableName: string
  objectType: DatabaseObjectType
  businessName: string | null
  aiEnabled: boolean
  totalColumns: number
  aiEnabledColumns: number
  primaryKeyColumns: number
  foreignKeys: number
}
export interface DatabaseStatistics {
  summary: StatisticsCounts & { schemas: number }
  schemas: SchemaStatistics[]
  objects: ObjectStatistics[]
  pagination: { page: number, pageSize: number, total: number, totalPages: number }
}
export interface StatisticsParams {
  schemaId?: string
  objectType?: DatabaseObjectType
  aiEnabled?: boolean
  search?: string
  page?: number
  pageSize?: 50 | 100 | 200
}
