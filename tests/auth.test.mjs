import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAuthSession, authRedirect } from '../app/composables/authState.ts'
import { createPasswordForm } from '../app/composables/passwordForm.ts'
import { createTokenStorage } from '../app/services/tokenStorage.ts'
import { createDatabaseService } from '../app/services/databaseService.ts'
import { createDataCollectionState } from '../app/composables/dataCollectionState.ts'

const fullPermissions = ['metadata.read', 'metadata.edit', 'metadata.scan']
const userDto = { id: 1, username: 'tester', full_name: 'Test User', auth_source: 'local', roles: ['ADMIN'], permissions: fullPermissions }
const testToken = 'isolated-test-token'
function fixture({ role = 'ADMIN', permissions = fullPermissions, stored = null } = {}) {
  const data = new Map(stored ? [['erp.access-token', stored]] : [])
  const storage = createTokenStorage({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) })
  const calls = []
  const statuses = new Map()
  const responseGates = new Map()
  let signedOut = 0
  let me = { ...userDto, roles: [role], permissions }
  const session = createAuthSession({ baseUrl: 'http://auth.test', storage, onSignedOut: () => {
    signedOut++
  }, fetcher: async (input, init) => {
    const path = new URL(input).pathname
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ path, method: init.method ?? 'GET', body, auth: new Headers(init.headers).get('Authorization') })
    if (responseGates.has(path)) await responseGates.get(path)
    const status = statuses.get(path)
    if (status === 'network') throw new Error('credential=private')
    if (status) return new Response('credential=private raw stack trace', { status })
    if (path === '/api/auth/login') return Response.json({ access_token: testToken, token_type: 'bearer', expires_in: 3600, user: me })
    if (path === '/api/auth/me') return Response.json(me)
    if (path === '/api/auth/profile') {
      me = { ...me, ...body }
      return Response.json(me)
    }
    if (path === '/api/auth/change-password') return new Response(null, { status: 204 })
    if (path === '/api/database/source') return Response.json({ id: 1, name: 'ERP', db_type: 'PostgreSQL', last_scan_at: null })
    return Response.json({})
  } })
  return { session, data, calls, statuses, responseGates, signedOut: () => signedOut, storage }
}
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('login success maps current user, fetches /me, persists token only, and adds Bearer centrally', async () => {
  const f = fixture()
  assert.equal(await f.session.login(' tester ', 'isolated-password'), true)
  assert.deepEqual(f.calls.map(x => x.path), ['/api/auth/login', '/api/auth/me'])
  assert.deepEqual(f.calls[0].body, { username: 'tester', password: 'isolated-password' })
  assert.equal(f.calls[0].auth, null)
  assert.equal(f.calls[1].auth, `Bearer ${testToken}`)
  assert.equal(f.session.user.value.fullName, 'Test User')
  assert.equal(f.session.user.value.authSource, 'local')
  assert.equal(f.session.user.value.id, '1')
  assert.equal(f.session.isAuthenticated.value, true)
  assert.deepEqual([...f.data.entries()], [['erp.access-token', testToken]])
  const database = createDatabaseService({ baseUrl: 'http://auth.test', fetcher: f.session.fetcher })
  await database.getSource()
  assert.equal(f.calls.at(-1).auth, `Bearer ${testToken}`)
})

for (const [status, expected] of [[401, 'Login yoki parol noto‘g‘ri.'], [422, 'Kiritilgan ma\'lumotlarni tekshiring.'], ['network', 'Backend API bilan aloqa o\'rnatilmadi.']]) {
  test(`invalid login / unavailable / validation: ${status}`, async () => {
    const f = fixture()
    f.statuses.set('/api/auth/login', status)
    await assert.rejects(f.session.login('tester', 'bad'), { message: expected })
    assert.equal(f.session.isAuthenticated.value, false)
    assert.equal(f.data.size, 0)
    assert.equal(f.session.isLoading.value, false)
    assert.equal(f.signedOut(), 0)
    assert.ok(!f.session.error.value.includes('private'))
  })
}

test('restoration coalesces /me and expired token clears state/storage', async () => {
  const f = fixture({ stored: testToken })
  await Promise.all([f.session.loadCurrentUser(), f.session.loadCurrentUser()])
  assert.equal(f.calls.length, 1)
  assert.equal(f.session.isAuthenticated.value, true)
  f.statuses.set('/api/auth/me', 401)
  await assert.rejects(f.session.loadCurrentUser())
  assert.equal(f.session.user.value, null)
  assert.equal(f.data.size, 0)
  assert.equal(f.signedOut(), 1)
})

test('parallel protected 401s trigger a single invalidation; 403 keeps auth and safe error', async () => {
  const f = fixture()
  await f.session.login('tester', 'isolated-password')
  const database = createDatabaseService({ baseUrl: 'http://auth.test', fetcher: f.session.fetcher })
  f.statuses.set('/api/database/source', 403)
  await assert.rejects(database.getSource(), { message: 'Ushbu amal uchun ruxsatingiz yo\'q.' })
  assert.equal(f.session.isAuthenticated.value, true)
  assert.equal(f.data.size, 1)
  assert.equal(f.signedOut(), 0)
  f.statuses.set('/api/database/source', 401)
  await Promise.allSettled([database.getSource(), database.getSource(), database.getSource()])
  assert.equal(f.signedOut(), 1)
  assert.equal(f.session.isAuthenticated.value, false)
  assert.equal(f.data.size, 0)
})

test('logout honors the unsaved guard before clearing, makes no backend call, and old /me cannot restore user', async () => {
  const f = fixture()
  await f.session.login('tester', 'isolated-password')
  const unregister = f.session.registerLeaveGuard(async () => false)
  assert.equal(await f.session.logout(), false)
  assert.equal(f.session.isAuthenticated.value, true)
  unregister()
  const gate = deferred()
  f.responseGates.set('/api/auth/me', gate.promise)
  const pending = f.session.loadCurrentUser()
  const count = f.calls.length
  assert.equal(await f.session.logout(), true)
  assert.equal(f.calls.length, count)
  gate.resolve()
  await pending
  assert.equal(f.session.user.value, null)
  assert.equal(f.data.size, 0)
})

test('protected routes/login redirects have no loop', () => {
  for (const path of ['/', '/profile', '/data-collection', '/admin/users', '/platform']) assert.equal(authRedirect(path, false), '/login')
  assert.equal(authRedirect('/login', false), null)
  assert.equal(authRedirect('/login/', false), null)
  assert.equal(authRedirect('/login/', true), '/')
  assert.equal(authRedirect('/login', true), '/')
  assert.equal(authRedirect('/profile', true), null)
})

for (const role of ['ADMIN', 'AI_SPECIALIST', 'VIEWER']) {
  test(`${role} metadata permission policy and denied action guards`, async () => {
    const permissions = role === 'VIEWER' ? ['metadata.read'] : fullPermissions
    const f = fixture({ role, permissions })
    await f.session.login('tester', 'isolated-password')
    assert.equal(f.session.hasPermission('metadata.read'), true)
    assert.equal(f.session.hasPermission('metadata.edit'), role !== 'VIEWER')
    assert.equal(f.session.hasPermission('metadata.scan'), role !== 'VIEWER')
    const mock = createDatabaseService({ useMockApi: true, delayMs: 0 })
    let patches = 0
    let scans = 0
    const update = mock.updateTable
    mock.updateTable = async (...args) => {
      patches++
      return update(...args)
    }
    const scan = mock.scanDatabase
    mock.scanDatabase = async () => {
      scans++
      return scan()
    }
    const state = createDataCollectionState(mock, async () => true, f.session.hasPermission)
    await state.load()
    await state.select(state.objects.value[0].id)
    assert.equal(state.editingDisabled.value, role === 'VIEWER')
    state.updateSelected({ ...state.selected.value, businessName: 'Edited' })
    await state.save()
    await state.scan()
    assert.equal(patches, role === 'VIEWER' ? 0 : 1)
    assert.equal(scans, role === 'VIEWER' ? 0 : 1)
  })
}

test('role label never grants access without permission, including metadata.read', async () => {
  const f = fixture({ role: 'ADMIN', permissions: [] })
  await f.session.login('tester', 'isolated-password')
  assert.equal(f.session.hasPermission('metadata.edit'), false)
  const service = createDatabaseService({ fetcher: async () => {
    assert.fail('No metadata request allowed')
  } })
  const state = createDataCollectionState(service, undefined, f.session.hasPermission)
  await state.load()
  await state.select('1')
  await state.scan()
  assert.equal(state.source.value, null)
})

test('profile load and partial name/username updates replace centralized user immediately', async () => {
  const f = fixture()
  await f.session.login('tester', 'isolated-password')
  await f.session.updateProfile({ fullName: 'Updated Person' })
  assert.deepEqual(f.calls.at(-1).body, { full_name: 'Updated Person' })
  assert.equal(f.session.user.value.fullName, 'Updated Person')
  assert.equal(f.session.user.value.username, 'tester')
  await f.session.updateProfile({ username: ' renamed ' })
  assert.deepEqual(f.calls.at(-1).body, { username: 'renamed' })
  assert.equal(f.session.user.value.username, 'renamed')
  await f.session.updateProfile({ fullName: null })
  assert.equal(f.session.user.value.fullName, null)
  assert.equal(f.calls.at(-1).auth, `Bearer ${testToken}`)
})

for (const [status, message] of [[409, 'Bu login allaqachon ishlatilmoqda.'], [422, 'Kiritilgan ma\'lumotlarni tekshiring.']]) {
  test(`profile ${status} uses safe message and preserves previous user`, async () => {
    const f = fixture()
    await f.session.login('tester', 'isolated-password')
    f.statuses.set('/api/auth/profile', status)
    await assert.rejects(f.session.updateProfile({ username: 'duplicate' }), { message })
    assert.equal(f.session.user.value.username, 'tester')
  })
}

test('password 204 maps current/new only, clears fields, leaves JWT valid and shows success', async () => {
  const f = fixture()
  await f.session.login('tester', 'isolated-password')
  const form = createPasswordForm(f.session.changePassword)
  form.currentPassword.value = 'isolated-old-password'
  form.newPassword.value = 'isolated-new-password'
  form.confirmation.value = 'isolated-new-password'
  await form.submit()
  assert.deepEqual(f.calls.at(-1).body, { current_password: 'isolated-old-password', new_password: 'isolated-new-password' })
  assert.equal(form.success.value, 'Parol muvaffaqiyatli o\'zgartirildi.')
  assert.equal(form.currentPassword.value, '')
  assert.equal(form.newPassword.value, '')
  assert.equal(form.confirmation.value, '')
  assert.equal(f.session.isAuthenticated.value, true)
  assert.equal(f.signedOut(), 0)
  assert.deepEqual([...f.data.values()], [testToken])
})

for (const [current, next, confirmation] of [
  ['', 'long-enough-password', 'long-enough-password'],
  ['current', 'long-enough-password', 'mismatch'],
  ['current', 'short', 'short'],
  ['current', ' '.repeat(12), ' '.repeat(12)],
  ['same-long-password', 'same-long-password', 'same-long-password'],
  ['current', 'a'.repeat(1025), 'a'.repeat(1025)]
]) {
  test(`password invalid form prevents request: ${current.length}/${next.length}/${confirmation.length}`, async () => {
    let called = false
    const form = createPasswordForm(async () => {
      called = true
      return true
    })
    form.currentPassword.value = current
    form.newPassword.value = next
    form.confirmation.value = confirmation
    await form.submit()
    assert.ok(form.error.value)
    assert.equal(called, false)
  })
}

test('incorrect current password safe 400 error clears submitted secrets but keeps session', async () => {
  const f = fixture()
  await f.session.login('tester', 'isolated-password')
  f.statuses.set('/api/auth/change-password', 400)
  const form = createPasswordForm(f.session.changePassword)
  form.currentPassword.value = 'incorrect-password'
  form.newPassword.value = 'different-long-password'
  form.confirmation.value = 'different-long-password'
  await form.submit()
  assert.equal(form.error.value, 'Joriy yoki yangi parolni tekshiring.')
  assert.equal(form.currentPassword.value, '')
  assert.equal(form.newPassword.value, '')
  assert.equal(form.success.value, '')
  assert.equal(f.session.isAuthenticated.value, true)
})

test('transport refuses external origins and never forwards token in redirects or URLs', async () => {
  const f = fixture()
  await f.session.login('tester', 'isolated-password')
  const count = f.calls.length
  await assert.rejects(f.session.fetcher('https://external.test/api/steal'))
  assert.equal(f.calls.length, count)
  assert.ok(f.calls.every(call => !call.path.includes(testToken)))
})

test('login duplicate submission is guarded while credentials are in flight', async () => {
  const f = fixture()
  const gate = deferred()
  f.responseGates.set('/api/auth/login', gate.promise)
  const pending = f.session.login('tester', 'isolated-password')
  assert.equal(f.session.isLoading.value, true)
  assert.equal(await f.session.login('tester', 'isolated-password'), false)
  assert.equal(f.calls.filter(call => call.path === '/api/auth/login').length, 1)
  gate.resolve()
  assert.equal(await pending, true)
})

test('temporary restoration network failure preserves token for retry without authenticating user', async () => {
  const f = fixture({ stored: testToken })
  f.statuses.set('/api/auth/me', 'network')
  await assert.rejects(f.session.loadCurrentUser())
  assert.equal(f.session.isAuthenticated.value, false)
  assert.equal(f.data.size, 1)
  assert.equal(f.signedOut(), 0)
  f.statuses.clear()
  await f.session.loadCurrentUser()
  assert.equal(f.session.isAuthenticated.value, true)
})

test('blocked sessionStorage falls back to memory without persisting passwords', () => {
  const storage = createTokenStorage({
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') }
  })
  assert.equal(storage.get(), null)
  storage.set(testToken)
  assert.equal(storage.get(), testToken)
  storage.clear()
  assert.equal(storage.get(), null)
})
