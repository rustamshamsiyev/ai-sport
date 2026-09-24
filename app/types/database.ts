export type DatabaseObjectType = 'TABLE' | 'VIEW'
export type MockScenario = 'normal' | 'empty' | 'load-error' | 'scan-error' | 'save-error'

export interface BusinessMetadata {
  businessName: string
  description: string
  aiEnabled: boolean
}

export interface SemanticPatch {
  businessName?: string | null
  description?: string | null
  aiEnabled?: boolean
}

export interface DatabaseColumn extends BusinessMetadata {
  id: string
  technicalName: string
  dataType: string
  nullable: boolean
  primaryKey: boolean
  foreignKey: string | null
  isForeignKey?: boolean
}

export interface DatabaseObject extends BusinessMetadata {
  id: string
  schema: string
  technicalName: string
  objectType: DatabaseObjectType
  columns: DatabaseColumn[]
  columnCount?: number
  primaryKeyCount?: number
  foreignKeyCount?: number
}

export interface DatabaseSchema {
  id?: string
  name: string
  tableCount?: number
  viewCount?: number
}

export interface DataSource {
  id: string
  name: string
  databaseType: string
  connectionStatus: 'connected' | 'disconnected' | 'unknown'
  schemaCount: number | null
  tableCount: number | null
  viewCount: number | null
  columnCount: number | null
  lastScanAt: string | null
}

export interface DatabaseSnapshot {
  source: DataSource
  schemas: DatabaseSchema[]
  objects: DatabaseObject[]
}

export interface SaveMetadataInput extends BusinessMetadata {
  id: string
  columns: (BusinessMetadata & { id: string })[]
}

export interface ScanStatus {
  progress?: number
  message: string
}

// The UI depends on this contract, not on a PostgreSQL client or connection string.
export interface MockDatabaseService {
  load: () => Promise<DatabaseSnapshot>
  scan: (onProgress: (status: ScanStatus) => void) => Promise<DatabaseSnapshot>
  save: (input: SaveMetadataInput) => Promise<DatabaseObject>
}

export interface ScanResult {
  schemas: number
  tables: number
  views: number
  columns: number
  primaryKeys: number
  foreignKeys: number
  durationMs: number
}

export interface DatabaseService {
  getStatistics: (params?: import('./statistics.ts').StatisticsParams) => Promise<import('./statistics.ts').DatabaseStatistics>
  updateTable: (tableId: string, payload: SemanticPatch) => Promise<DatabaseObject>
  updateColumn: (columnId: string, payload: SemanticPatch) => Promise<DatabaseColumn>
  getSource: () => Promise<DataSource>
  getSchemas: () => Promise<DatabaseSchema[]>
  getTables: (schemaId: string) => Promise<DatabaseObject[]>
  getTable: (tableId: string) => Promise<DatabaseObject>
  getColumns: (tableId: string) => Promise<DatabaseColumn[]>
  scanDatabase: () => Promise<ScanResult>
}
