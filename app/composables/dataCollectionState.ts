import { computed, ref } from 'vue'
import { databaseErrorMessage } from '../services/databaseService.ts'
import type { BusinessMetadata, DatabaseColumn, DatabaseObject, DatabaseSchema, DatabaseService, DataSource, ScanResult, SemanticPatch } from '../types/database.ts'

const semantic = (value: BusinessMetadata): BusinessMetadata => ({ businessName: value.businessName, description: value.description, aiEnabled: value.aiEnabled })
const clone = (value: DatabaseObject): DatabaseObject => ({ ...value, columns: value.columns.map(column => ({ ...column })) })
export function semanticDiff(before: BusinessMetadata, after: BusinessMetadata): SemanticPatch {
  const patch: SemanticPatch = {}
  if (before.businessName !== after.businessName) patch.businessName = after.businessName
  if (before.description !== after.description) patch.description = after.description
  if (before.aiEnabled !== after.aiEnabled) patch.aiEnabled = after.aiEnabled
  return patch
}
const changed = (patch: SemanticPatch) => Object.keys(patch).length > 0

export function createDataCollectionState(service: DatabaseService, confirmDiscard: () => Promise<boolean> = async () => false, hasPermission: (permission: string) => boolean = () => true) {
  const source = ref<DataSource | null>(null)
  const schemas = ref<DatabaseSchema[]>([])
  const objects = ref<DatabaseObject[]>([])
  const selected = ref<DatabaseObject | null>(null)
  const baseline = ref<DatabaseObject | null>(null)
  const selectedId = ref<string | null>(null)
  const schemaId = ref('')
  const scanning = ref(false)
  const saving = ref(false)
  const confirming = ref(false)
  const saveError = ref('')
  const success = ref('')
  const scanResult = ref<ScanResult | null>(null)
  const scanError = ref('')
  const states = ref(Object.fromEntries(['source', 'schemas', 'tables', 'details', 'columns'].map(key => [key, { loading: false, error: '' }])) as Record<'source' | 'schemas' | 'tables' | 'details' | 'columns', { loading: boolean, error: string }>)
  let disposed = false
  let tableVersion = 0
  let detailVersion = 0
  const initializing = ref(false)
  const tablePatch = computed(() => baseline.value && selected.value ? semanticDiff(baseline.value, selected.value) : {})
  const tableDirty = computed(() => changed(tablePatch.value))
  const columnPatches = computed(() => {
    const originals = new Map(baseline.value?.columns.map(column => [column.id, column]))
    return (selected.value?.columns ?? []).flatMap((column) => {
      const original = originals.get(column.id)
      const patch = original ? semanticDiff(original, column) : {}
      return changed(patch) ? [{ id: column.id, patch, name: column.technicalName }] : []
    })
  })
  const dirtyColumnIds = computed(() => columnPatches.value.map(column => column.id))
  const dirty = computed(() => tableDirty.value || dirtyColumnIds.value.length > 0)
  const dirtyIds = computed(() => dirty.value && selectedId.value ? [selectedId.value] : [])
  const busy = computed(() => scanning.value || saving.value || confirming.value || initializing.value)
  const editingDisabled = computed(() => !hasPermission('metadata.edit') || busy.value || states.value.details.loading || states.value.columns.loading || !!states.value.details.error || !!states.value.columns.error)
  function discard() {
    selected.value = baseline.value ? clone(baseline.value) : null
    saveError.value = ''
    success.value = ''
  }
  async function allowDiscard() {
    if (saving.value || confirming.value || disposed) return false
    if (!dirty.value) return true
    confirming.value = true
    try {
      const accepted = await confirmDiscard()
      if (!accepted || disposed) return false
      discard()
      return true
    } finally { confirming.value = false }
  }
  async function run<T>(key: keyof typeof states.value, task: () => Promise<T>, apply: (result: T) => void, current = () => true) {
    states.value[key] = { loading: true, error: '' }
    try {
      const result = await task()
      if (!disposed && current()) apply(result)
    } catch (error) {
      if (!disposed && current()) states.value[key].error = databaseErrorMessage(error)
    } finally {
      if (!disposed && current()) states.value[key].loading = false
    }
  }
  function clearSelection() {
    selectedId.value = null
    selected.value = null
    baseline.value = null
    saveError.value = ''
    success.value = ''
    ++detailVersion
    states.value.details = { loading: false, error: '' }
    states.value.columns = { loading: false, error: '' }
  }
  async function select(id: string, refresh = false) {
    if (!hasPermission('metadata.read')) return
    if (disposed || saving.value || confirming.value || (busy.value && !refresh)) return
    if (!refresh && dirty.value && !(await allowDiscard())) return
    clearSelection()
    selectedId.value = id
    const version = detailVersion
    const current = () => version === detailVersion
    let columns: DatabaseColumn[] | undefined
    await Promise.all([
      run('details', () => service.getTable(id), (table) => {
        selected.value = { ...table, columns: columns ?? [] }
        baseline.value = clone(selected.value)
      }, current),
      run('columns', () => service.getColumns(id), (result) => {
        columns = result
        if (selected.value) selected.value.columns = result
        if (baseline.value) baseline.value.columns = result.map(column => ({ ...column }))
      }, current)
    ])
  }
  async function selectSchema(id: string, refresh = false) {
    if (!hasPermission('metadata.read')) return
    if (disposed || saving.value || confirming.value || (busy.value && !refresh)) return
    if (!refresh && dirty.value && !(await allowDiscard())) return
    schemaId.value = id
    objects.value = []
    clearSelection()
    const version = ++tableVersion
    states.value.tables = { loading: false, error: '' }
    if (!id) return
    await run('tables', () => service.getTables(id), (result) => {
      objects.value = result
    }, () => version === tableVersion)
  }
  async function load(refresh = false) {
    if (!hasPermission('metadata.read')) return
    if (disposed || initializing.value || saving.value || confirming.value || (scanning.value && !refresh)) return
    if (!refresh && dirty.value && !(await allowDiscard())) return
    initializing.value = true
    const previousId = selectedId.value
    try {
      await Promise.all([
        run('source', () => service.getSource(), (result) => { source.value = result }),
        run('schemas', () => service.getSchemas(), (result) => { schemas.value = result })
      ])
      if (disposed || states.value.schemas.error) return
      if (source.value) {
        source.value.schemaCount = schemas.value.length
        if (schemas.value.every(item => item.tableCount !== undefined)) source.value.tableCount = schemas.value.reduce((sum, item) => sum + item.tableCount!, 0)
        if (schemas.value.every(item => item.viewCount !== undefined)) source.value.viewCount = schemas.value.reduce((sum, item) => sum + item.viewCount!, 0)
      }
      const id = schemas.value.find(item => item.id === schemaId.value)?.id ?? schemas.value[0]?.id ?? ''
      await selectSchema(id, true)
      if (previousId && objects.value.some(item => item.id === previousId)) await select(previousId, true)
    } finally { initializing.value = false }
  }
  async function scan() {
    if (!hasPermission('metadata.scan')) return
    if (busy.value || disposed) return
    if (dirty.value && !(await allowDiscard())) return
    scanning.value = true
    scanError.value = ''
    scanResult.value = null
    success.value = ''
    try {
      const result = await service.scanDatabase()
      if (disposed) return
      scanResult.value = result
      await load(true)
      if (!disposed && source.value) source.value.columnCount = result.columns
    } catch (error) {
      if (!disposed) scanError.value = databaseErrorMessage(error)
    } finally {
      if (!disposed) scanning.value = false
    }
  }
  function updateSelected(value: DatabaseObject) {
    const draft = selected.value
    if (!draft || value.id !== draft.id || editingDisabled.value || disposed) return
    const edits = new Map(value.columns.map(column => [column.id, column]))
    selected.value = {
      ...draft,
      ...semantic(value),
      columns: draft.columns.map(column => ({ ...column, ...semantic(edits.get(column.id) ?? column) }))
    }
    success.value = ''
  }
  async function save() {
    if (!selected.value || !baseline.value || !dirty.value || editingDisabled.value || disposed) return
    const id = selected.value.id
    const patch = { ...tablePatch.value }
    const columns = columnPatches.value.map(column => ({ ...column, patch: { ...column.patch } }))
    saving.value = true
    saveError.value = ''
    success.value = ''
    const failures: string[] = []
    try {
      if (changed(patch)) {
        try {
          const saved = await service.updateTable(id, patch)
          if (disposed) return
          selected.value = { ...saved, columns: selected.value.columns }
          baseline.value = { ...saved, columns: baseline.value.columns }
          objects.value = objects.value.map(object => object.id === id ? { ...saved, columns: object.columns } : object)
        } catch (error) {
          failures.push(`Table: ${databaseErrorMessage(error)}`)
        }
      }
      // Sequential updates avoid flooding the API and make individual successes durable.
      for (const column of columns) {
        if (disposed) return
        try {
          const saved = await service.updateColumn(column.id, column.patch)
          if (disposed) return
          selected.value.columns = selected.value.columns.map(item => item.id === saved.id ? { ...saved } : item)
          baseline.value.columns = baseline.value.columns.map(item => item.id === saved.id ? { ...saved } : item)
        } catch (error) {
          failures.push(`${column.name}: ${databaseErrorMessage(error)}`)
        }
      }
      if (disposed) return
      saveError.value = failures.join(' ')
      if (!failures.length) success.value = 'Semantic ma’lumotlar saqlandi.'
    } finally {
      if (!disposed) saving.value = false
    }
  }
  function dispose() {
    disposed = true
    ++tableVersion
    ++detailVersion
  }
  return { source, schemas, objects, selected, selectedId, schemaId, scanning, scanResult, scanError, states, busy, editingDisabled, saving, saveError, success, tableDirty, dirtyColumnIds, dirty, dirtyIds, allowDiscard, updateSelected, save, load, select, selectSchema, scan, dispose }
}
