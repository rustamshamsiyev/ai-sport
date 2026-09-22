// Opt-in: node --env-file=.env --import ./tests/register-vue.mjs tests/manual-auth-smoke.mjs
// Credentials must be provided as AUTH_SMOKE_USERNAME/AUTH_SMOKE_PASSWORD.
// Never calls change-password or creates users. Never prints credentials or JWT.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAuthSession } from '../app/composables/authState.ts'
import { createDatabaseService } from '../app/services/databaseService.ts'
import { createDataCollectionState } from '../app/composables/dataCollectionState.ts'
import { safeApiMessage } from '../app/services/apiClient.ts'

const baseUrl = process.env.NUXT_PUBLIC_API_BASE_URL
const username = process.env.AUTH_SMOKE_USERNAME
const password = process.env.AUTH_SMOKE_PASSWORD
if (!baseUrl || !username || !password) {
  console.error('SKIPPED: configure API base URL and AUTH_SMOKE_USERNAME/AUTH_SMOKE_PASSWORD locally.')
  process.exitCode = 1
} else {
  let token = null
  const storage = {
    get: () => token,
    set: (value) => { token = value },
    clear: () => { token = null }
  }
  const auth = createAuthSession({ baseUrl, storage })
  const database = createDatabaseService({ baseUrl, fetcher: auth.fetcher })
  let originalProfile
  let originalTable
  let originalColumn
  let profileAttempted = false
  let metadataAttempted = false
  async function rawGet(path) {
    const response = await auth.fetcher(`${baseUrl}/api/database/${path}`)
    assert.equal(response.status, 200)
    return response.json()
  }
  const semantic = dto => ({ business_name: dto.business_name, description: dto.description, ai_enabled: dto.ai_enabled })
  async function restoreMetadata(path, dto) {
    const response = await auth.fetcher(`${baseUrl}/api/database/${path}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(semantic(dto))
    })
    assert.equal(response.status, 200)
  }
  try {
    assert.ok(await auth.login(username, password))
    assert.ok(auth.roles.value.includes('ADMIN'), 'ADMIN account required for this manual check.')
    assert.ok(['metadata.read', 'metadata.edit', 'metadata.scan'].every(auth.hasPermission))
    originalProfile = { username: auth.user.value.username, fullName: auth.user.value.fullName }
    const state = createDataCollectionState(database, async () => true, auth.hasPermission)
    await state.load()
    assert.ok(state.source.value && state.objects.value.length, 'Metadata required.')
    const tableId = state.objects.value[0].id
    await state.select(tableId)
    assert.ok(state.selected.value?.columns.length, 'Table with columns required.')
    originalTable = await rawGet(`tables/${tableId}`)
    originalColumn = (await rawGet(`tables/${tableId}/columns?limit=1000`)).items[0]
    const recovery = join(tmpdir(), `erp-auth-smoke-recovery-${Date.now()}.json`)
    await writeFile(recovery, JSON.stringify({ profile: originalProfile, table: originalTable, column: originalColumn }, null, 2))
    console.log(`Recovery record (no password/token): ${recovery}`)
    console.log('PASS real ADMIN login, /me, metadata read and permissions')
    const marker = `Verification ${Date.now()}`
    state.updateSelected({ ...state.selected.value, businessName: marker, columns: state.selected.value.columns.map(column => column.id === String(originalColumn.id) ? { ...column, businessName: marker } : column) })
    metadataAttempted = true
    await state.save()
    assert.ok(!state.saveError.value && !state.dirty.value, 'Metadata Save failed.')
    assert.ok((await database.getTable(tableId)).businessName === marker)
    assert.ok((await database.getColumns(tableId)).find(column => column.id === String(originalColumn.id)).businessName === marker)
    await state.load()
    assert.ok(state.selected.value.businessName === marker, 'Refresh must preserve saved values.')
    console.log('PASS real ADMIN metadata edit, Save, GET and state refresh')
    profileAttempted = true
    assert.ok(await auth.updateProfile({ username: `auth_smoke_${Date.now()}`, fullName: marker }))
    await auth.loadCurrentUser()
    assert.ok(auth.user.value.fullName === marker)
    console.log('PASS real ADMIN partial profile update and /me')
    await state.scan()
    assert.ok(state.scanResult.value && !state.scanError.value)
    console.log('PASS real ADMIN scan and refresh')
  } catch (error) {
    console.error(`FAIL smoke test: ${safeApiMessage(error)}`)
    process.exitCode = 1
  } finally {
    const restoration = await Promise.allSettled([
      profileAttempted ? auth.updateProfile(originalProfile) : Promise.resolve(),
      metadataAttempted ? restoreMetadata(`tables/${originalTable.id}`, originalTable) : Promise.resolve(),
      metadataAttempted ? restoreMetadata(`columns/${originalColumn.id}`, originalColumn) : Promise.resolve()
    ])
    try {
      assert.ok(restoration.every(result => result.status === 'fulfilled'), 'Restoration request failed.')
      if (profileAttempted) {
        await auth.loadCurrentUser()
        assert.ok(auth.user.value.username === originalProfile.username && auth.user.value.fullName === originalProfile.fullName, 'Exact profile restore failed.')
      }
      if (metadataAttempted) {
        const table = await rawGet(`tables/${originalTable.id}`)
        const column = (await rawGet(`tables/${originalTable.id}/columns?limit=1000`)).items.find(item => item.id === originalColumn.id)
        assert.ok(JSON.stringify(semantic(table)) === JSON.stringify(semantic(originalTable)), 'Exact table restore failed.')
        assert.ok(JSON.stringify(semantic(column)) === JSON.stringify(semantic(originalColumn)), 'Exact column restore failed.')
      }
      if (profileAttempted || metadataAttempted) console.log('PASS exact restoration verified: profile and metadata; ADMIN password never changed')
    } catch {
      console.error('FAIL restoration: use the recovery record to restore original values.')
      process.exitCode = 1
    }
    await auth.logout()
  }
}
