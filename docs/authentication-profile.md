# Frontend Authentication & Profile v1

Contract verified from the running FastAPI OpenAPI document at
http://127.0.0.1:4000/openapi.json on 2026-09-21. No backend changes,
refresh-token endpoint, logout endpoint or user-management endpoint were added.

## Run and behavior

Keep the existing local configuration:

```dotenv
NUXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
NUXT_PUBLIC_USE_MOCK_API=false
```

Run `npm run dev` and open `/login`. Every other application route requires a
verified user. Authenticated `/login` visits redirect to `/`. `/profile` is
available from the existing header user menu, along with local logout.

## Actual API mapping

| Operation | Request | Response |
| --- | --- | --- |
| login | POST auth/login: username (trimmed), password | access_token → private token; expires_in → expiresIn; then GET auth/me |
| getCurrentUser | GET auth/me | id → string; full_name → nullable fullName; auth_source → authSource; roles and permissions preserved |
| updateProfile | PATCH auth/profile: only provided username/full_name | Mapped UserResponse replaces central user, including header |
| changePassword | POST auth/change-password: current_password/new_password | 204 handled without JSON parsing |

Username is required, trimmed, 1–100 characters. Full name is optional, max 255,
and can be cleared to null. Profile form sends only changed values. Conflict 409
shows `Bu login allaqachon ishlatilmoqda.`; 422 shows
`Kiritilgan ma'lumotlarni tekshiring.`. Login 401 shows an invalid-credentials
message. Password 400 shows `Joriy yoki yangi parolni tekshiring.`. Backend bodies
and stack traces are never used as UI errors.

The password form verifies current password presence, matching confirmation,
12–1024 Unicode characters, non-whitespace and difference from the current
password before sending. Confirmation is never sent. All password fields clear
after a submitted request (success or failure) and on unmount. Successful 204
shows `Parol muvaffaqiyatli o'zgartirildi.`. Existing JWT remains valid per v1;
password change does not force logout.

## Session and transport

One auth session is created by a client Nuxt plugin. Components use `useAuth()`;
they do not create independent auth state or perform direct API requests.
Auth services and databaseService share `apiClient` through its protected fetch.
It attaches Authorization once, only for the configured API origin/path, rejects
redirects, omits cookies and avoids HTTP caching. Public login omits Bearer.

The JWT is stored under `erp.access-token` in sessionStorage. This supports same
tab reload/restoration without persistent localStorage, cookies or invented
refresh-token behavior. If storage is unavailable it falls back to page memory.
The token is private to service closures: no Vue state, SSR payload, DOM, query
string, console or error messages contain it. Passwords are never stored in web
storage and are not retained in central auth state.

SessionStorage is readable by same-origin JavaScript and is not equivalent to
HttpOnly storage. XSS prevention remains necessary. This implementation adds no
HTML rendering of user input, token decoding display, third-party token forwarding
or token logging. Deploy with HTTPS. The backend remains the authorization boundary.

Because this backend uses browser-stored Bearer tokens rather than server cookies,
app.vue renders a loading fallback on the server and mounts the application in
ClientOnly after browser route middleware. Protected page content is not rendered
into SSR HTML. The global route middleware restores via `/auth/me`; invalid tokens
are cleared and redirected to login. Temporary restoration network errors retain
the token for explicit retry but do not authenticate or expose protected pages.

The backend validates expiry (currently 60 minutes). There is no refresh token.
Protected 401 responses clear state/storage and redirect once. Concurrent or stale
401 responses cannot create a redirect storm. 403 preserves the session and shows
`Ushbu amal uchun ruxsatingiz yo'q.`. Stale auth responses cannot restore a user
after logout. Logout calls no backend endpoint.

## Permissions and unsaved changes

Authorization checks permission strings, never role labels. Labels are only
display values: ADMIN → Administrator, AI_SPECIALIST → SI mutaxassisi,
VIEWER → Kuzatuvchi.

- metadata.read: permits data loading; missing permission shows a denial panel
  without issuing metadata read requests.
- metadata.edit: enables semantic fields and Save; state actions are guarded too.
- metadata.scan: enables Scan; the state action also checks permission.

Both ADMIN and AI_SPECIALIST test fixtures have read/edit/scan. VIEWER has read
only. Even an ADMIN label with no permission grants no access. Backend 403 remains
the actual enforcement. Explicit mock metadata mode still works after login and
uses the same permission checks; it does not bypass authentication.

Data Collection registers its existing discard guard with auth logout. Cancel
leaves both session and drafts intact. Continue clears session and navigates to
login. Ordinary route changes keep the existing modal. An expired session forces
logout and route exit, even if there are drafts; protected access cannot remain
active after 401. Browser reload/tab close keeps the existing beforeunload warning.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Auth tests use isolated in-memory users and mocked HTTP responses following the
real DTO contract. They cover login errors, Bearer, restoration, stale responses,
401/403, logout guard, permissions, partial profile updates, 409/422, password
validation, 204 and secret clearing. All 31 original metadata tests are retained.

Chrome UI checks with intercepted isolated API responses verified login → me,
session restoration, protected redirects, header updates, profile partial update,
409, password 204/field clearing/no logout, VIEWER read-only UI, unsaved logout
Cancel/Continue, 403 retention and 401 redirect. No production password was used
or changed in these tests. Backend user creation was not attempted because the
OpenAPI contract provides no isolated-user provisioning mechanism.

Real backend negative checks verified invalid login → 401 and unauthenticated
`/auth/me` → 401. Positive real ADMIN smoke testing passed on 2026-09-22 using
locally supplied credentials; credentials must never be committed.
For subsequent runs, set non-public AUTH_SMOKE_USERNAME and
AUTH_SMOKE_PASSWORD in the ignored local .env, then run:

```sh
node --env-file=.env --import ./tests/register-vue.mjs tests/manual-auth-smoke.mjs
```

The script exercises login/me, metadata state load/edit/Save/refresh/scan, profile
username/full-name update, and exact restoration in finally. A recovery record
containing original profile/metadata, but no JWT/password, is written to OS temp
before mutations. It never calls change-password and never creates users. Remove
the temporary smoke credential variables when finished. Without credentials it
reports SKIPPED and does not claim the real ADMIN flow passed.

## Final checks — 2026-09-22

- Tests: PASS, 58/58 (31 existing Data Collection tests and 27 auth tests).
- Lint: PASS, zero errors; one existing attribute-order warning in DatabaseExplorer.vue.
- TypeScript: PASS.
- Production build: PASS; dependency deprecation warnings remain non-blocking.
- Authentication, profile, password, permissions and Data Collection regression:
  PASS in automated tests and isolated browser checks described above.
- Real authenticated ADMIN smoke test: PASS (script exit code 0). Login, /me,
  read/edit/scan permissions, metadata loading, table/column semantic Save,
  subsequent GET and state reload, profile username/full-name PATCH and /me,
  and real scan with refresh all passed through frontend services/state.
- Production data restored: PASS. Original username/full name and table/column
  business_name, description and ai_enabled were restored and verified via GET.
  ADMIN password was never changed; password flow remains covered by isolated tests.
- Final acceptance: PASS. The real smoke run used service/state flows; browser UI
  coverage used the isolated responses described above.

## Changed files

New: `app/types/auth.ts`, `app/services/apiClient.ts`, `authService.ts`,
`tokenStorage.ts`, `app/composables/authState.ts`, `useAuth.ts`, `passwordForm.ts`,
`app/plugins/auth.client.ts`, `app/middleware/auth.global.ts`, `app/pages/login.vue`,
`profile.vue`, `app/components/PasswordChangeForm.vue`, `app/assets/css/auth.css`,
`tests/auth.test.mjs`, `tests/manual-auth-smoke.mjs`, and this document.

Updated: `app/app.vue`, `app/components/AppHeader.vue`,
`app/services/databaseService.ts`, `app/composables/dataCollectionState.ts`,
`app/composables/useDataCollection.ts`, `app/pages/data-collection/index.vue`,
and `docs/data-collection.md`. Existing unrelated workspace changes are preserved.
