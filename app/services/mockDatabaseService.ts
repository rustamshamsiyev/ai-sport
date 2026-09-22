import { createMockDatabase, summarizeDatabase } from '../mock/database.ts'
import type { BusinessMetadata, MockDatabaseService, MockScenario, SaveMetadataInput } from '../types/database.ts'

interface MockOptions {
  scenario?: MockScenario
  delayMs?: number
}

function normalize(input: BusinessMetadata): BusinessMetadata {
  const businessName = input.businessName.trim()
  const description = input.description.trim()
  if (businessName.length > 150 || description.length > 1000) {
    throw new Error('Biznes nomi 150, tavsif esa 1000 belgidan oshmasligi kerak.')
  }
  return { businessName, description, aiEnabled: input.aiEnabled }
}

// Instance-local state avoids sharing mutable mock data across SSR requests.
// Replace this factory with a Backend API adapter implementing DatabaseService later.
export function createDatabaseService(options: MockOptions = {}): MockDatabaseService {
  let database = options.scenario === 'empty'
    ? summarizeDatabase([], [], null)
    : createMockDatabase()
  const failures = new Set<string>()
  const delay = () => new Promise<void>(resolve => setTimeout(resolve, options.delayMs ?? 450))
  function failOnce(operation: string) {
    if (options.scenario === `${operation}-error` && !failures.has(operation)) {
      failures.add(operation)
      throw new Error(operation === 'load'
        ? 'Metadata yuklanmadi. Qayta urinib ko‘ring.'
        : operation === 'scan'
          ? 'Scan yakunlanmadi. Oldingi metadata saqlanib qoldi.'
          : 'O‘zgarishlar saqlanmadi. Tahrirlar yo‘qolmadi, qayta urinib ko‘ring.')
    }
  }
  return {
    async load() {
      await delay()
      failOnce('load')
      return structuredClone(database)
    },
    async scan(onProgress) {
      const steps = [
        { progress: 12, message: 'Schema ro‘yxati tekshirilmoqda…' },
        { progress: 38, message: 'Table va view metadata yig‘ilmoqda…' },
        { progress: 68, message: 'Column, PK va FK metadata tekshirilmoqda…' },
        { progress: 92, message: 'Scan natijalari tayyorlanmoqda…' }
      ]
      for (const step of steps) {
        onProgress(step)
        await delay()
      }
      failOnce('scan')
      database = summarizeDatabase(database.objects, database.schemas, new Date().toISOString())
      onProgress({ progress: 100, message: 'Scan muvaffaqiyatli yakunlandi' })
      return structuredClone(database)
    },
    async save(input: SaveMetadataInput) {
      // Snapshot the request before the asynchronous boundary.
      const request = structuredClone(input)
      await delay()
      failOnce('save')
      const index = database.objects.findIndex(item => item.id === request.id)
      const existing = database.objects[index]
      if (!existing) throw new Error('Tanlangan obyekt topilmadi.')
      const updates = new Map(request.columns.map(column => [column.id, column]))
      if (updates.size !== request.columns.length || updates.size !== existing.columns.length
        || existing.columns.some(column => !updates.has(column.id))) {
        throw new Error('Column ro‘yxati metadata bilan mos emas. O‘zgarishlar saqlanmadi.')
      }
      // Only editable metadata is accepted. Technical schema fields stay unchanged.
      const saved = {
        ...existing,
        ...normalize(request),
        columns: existing.columns.map(column => ({ ...column, ...normalize(updates.get(column.id)!) }))
      }
      database.objects[index] = saved
      return structuredClone(saved)
    }
  }
}
