# Data collection — FastAPI integration

Statistics v1 adds a lazy **Statistika** view with real global totals, AI counts,
schema statistics and server-filtered/paginated objects. Database drafts remain
mounted when switching views. See [Statistics verification](./data-collection-statistics.md)
for the contract, 80-test results and real backend/browser verification.

Full real-backend and Chrome UI verification (2026-09-19), including Save/restore,
scan, error injection and the schema Cancel fix:
[Frontend verification report](./data-collection-verification.md).

`/data-collection` uses the real Metadata Scanner API by default. Backend contract
was inspected at `http://127.0.0.1:4000/openapi.json` on 2026-09-18. Table and
column semantic editing now uses the verified PATCH endpoints. Technical
metadata remains read-only. Save is enabled only for changed semantic values.

## Run

Authentication is now required, including in explicit metadata mock mode.
Open `/login` first. The header provides Profile and Logout. Permission strings
control read/edit/scan; backend enforcement remains authoritative. See
[Authentication & Profile v1](./authentication-profile.md) for session storage,
route guards, token expiry and authenticated real-backend smoke testing.

Copy `.env.example` to `.env` if no local configuration exists, or merge these
values into your existing `.env`:

```dotenv
NUXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
NUXT_PUBLIC_USE_MOCK_API=false
```

```sh
npm run dev
```

Open the frontend URL printed by Nuxt, then `/data-collection`. The API base URL
comes from `runtimeConfig.public.apiBaseUrl`; no service/component hardcodes it.
A missing URL produces a configuration message, not a mock fallback.

For production:

```sh
npm run build
```

Set the same two environment variables in the server process environment, then
run `node .output/server/index.mjs`. Plain Node does not automatically read `.env`.
For local production preview, Node 24 can use
`node --env-file=.env .output/server/index.mjs`.

Requests run in the browser. Backend CORS must allow the actual frontend origin
(for example `http://localhost:3000`). No frontend proxy, no-cors mode or CORS
workaround is included. Connection/network errors show
`Backend API bilan aloqa o'rnatilmadi.`; HTTP and parsing errors also use safe
messages. Backend bodies, stack traces and credentials are never rendered.

## API mapping

| Operation | Endpoint | Frontend mapping |
| --- | --- | --- |
| getSource | GET /api/database/source | id → string; db_type → databaseType; last_scan_at → lastScanAt |
| getSchemas | GET /api/database/schemas | id → string; schema_name → name; table_count/view_count → tableCount/viewCount |
| getTables(schemaId) | GET /api/database/tables?schema_id=... | schema_id resolved through loaded schemas; table_name → technicalName; object_type → objectType |
| getTable(tableId) | GET /api/database/tables/{id} | Same table mapping; column_count/primary_key_count/foreign_key_count → technical counts |
| getColumns(tableId) | GET /api/database/tables/{id}/columns | column_name → technicalName; data_type (fallback udt_name) → dataType; is_nullable/is_primary_key/is_foreign_key → nullable/primaryKey/isForeignKey |
| scanDatabase | POST /api/database/scan, no body | schemas/tables/views/columns preserved; primary_keys/foreign_keys/duration_ms → primaryKeys/foreignKeys/durationMs |
| updateTable(tableId, payload) | PATCH /api/database/tables/{id} | Partial businessName/description/aiEnabled → business_name/description/ai_enabled; response through table mapper |
| updateColumn(columnId, payload) | PATCH /api/database/columns/{id} | Same partial semantic payload; response through column mapper |

PATCH whitelists only the three semantic fields. Unchanged fields are omitted;
cleared text becomes null, and ai_enabled must be boolean (never null).
404 shows `Metadata obyekti topilmadi.`, 422 shows
`Kiritilgan ma'lumotlarni tekshiring.`, and network failures use the safe
connection message. Raw backend errors are never displayed.

For tables and columns, `business_name`, `description`, `ai_enabled` become
`businessName`, `description`, `aiEnabled`. Nullable text becomes an empty string;
false booleans are preserved. The API supplies a foreign-key flag but no target:
UI shows FK without inventing a referenced column. Table PK/FK counts use the
backend counts instead of recounting loaded columns.

Source does not provide health or aggregate counts. `is_active` is not treated
as connection health. UI shows unknown connection status. Schema/table/view
totals come from the schema list; global columns show an em dash until a real
scan supplies that count. Zone-free timestamps are shown as backend time;
only timestamps carrying a zone are converted to Asia/Tashkent.

All list endpoints return `{ items, total, limit, offset }`. The adapter requests
1000 entries per page until the total is reached, including schemas and columns.
Only the chosen schema's table list is fetched. Search/filter cover that complete
list, while the explorer renders at most 50 objects per UI page. Columns are
fetched only for the selected table. No columns are prefetched for all tables.

## State and boundaries

- Source and schemas initialize independently, then tables for the selected or
  first schema load. Table details and columns load independently on selection.
- Every request group has its own loading, safe error and retry UI.
- Selection request versions prevent late responses from replacing newer data.
- Scan uses indeterminate loading. Repeat scans are guarded through the refresh.
  The service also coalesces overlapping scan calls within its instance.
- Successful scan shows all seven returned statistics and refreshes source,
  schemas, tables and the selected table if it still exists. Refresh failures
  remain visible separately from a successful scan result.
- Unmounted state ignores pending responses. GET timeout is 30 seconds; scan
  timeout is five minutes. Network failure cannot prove the server stopped its
  scan; a subsequent server 409 is displayed as scan already in progress.

## Explicit mock mode

Set `NUXT_PUBLIC_USE_MOCK_API=true` and restart Nuxt. A mock banner is shown.
Fixtures are dynamically loaded only in this mode; `?mock=` never enables it.
Scenarios: `normal`, `empty`, `load-error`, `scan-error`, `save-error`. The original
isolated mock save service and regression tests remain unchanged. The mock
adapter applies partial semantic updates through that service. Editing and Save
work in mock mode without any network writes.
`app/mock/database.ts` remains unchanged.

## Semantic Save and unsaved changes

The selected object has a draft and a separate baseline from the last backend
response. Only businessName, description and aiEnabled are compared. Table
dirty state and changed column IDs are computed independently; reverting values
clears their dirty state. Technical edits are ignored by the state layer.

Save snapshots the partial changes, PATCHes the table only if dirty, then PATCHes
only changed columns sequentially. Every successful response immediately updates
the draft and baseline; table changes also update the explorer. Failures do not
stop subsequent column saves. Only failed changes remain dirty and are retried
on the next Save. Full success shows `Semantic ma’lumotlar saqlandi.`; partial
failure shows safe object-specific errors, without a success notification.

Save, semantic controls and overlapping actions are disabled during saving.
Table/schema changes, refresh, scan and route navigation prompt before discarding
unsaved edits using the existing Nuxt UI modal. Cancel preserves the current
draft; Continue discards it. Closing the modal also cancels. Browser reload/tab
close uses the native beforeunload warning. Navigation during Save is blocked.

Semantic integration files: `app/types/database.ts`,
`app/services/databaseService.ts`, `app/composables/dataCollectionState.ts`,
`app/composables/useDataCollection.ts`, `app/pages/data-collection/index.vue`,
`app/components/data-collection/TableDetails.vue`,
`app/components/data-collection/DatabaseExplorer.vue`,
`tests/databaseSemantic.test.mjs`, `tests/manual-semantic-smoke.mjs`, and this
document. Existing ColumnsTable edit events are enabled by the parent state.

## Changed files for this integration

- `.env.example`, `nuxt.config.ts`, `package.json`
- `app/types/database.ts`
- `app/services/databaseService.ts`, `app/services/mockDatabaseService.ts`
- `app/composables/useDataCollection.ts`, `app/composables/dataCollectionState.ts`
- `app/pages/data-collection/index.vue`
- `app/components/data-collection/DatabaseExplorer.vue`, `DataSourceCard.vue`,
  `TableDetails.vue`, `ColumnsTable.vue`, `ScanProgress.vue`
- `tests/databaseService.test.mjs`, `tests/databaseApi.test.mjs`,
  `tests/register-vue.mjs`
- `docs/data-collection.md`

## Verification

Node 24:

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Tests cover DTO mapping, null/false values, 1101-entry pagination, source/schema/
table loading, table selection, column loading, stale responses, safe errors,
retries, guarded scan and refresh, scan failures, backend unavailable, explicit
mock mode and the original mock regressions. Test resolution uses Nuxt's existing
Vue runtime; no separate Vue installation is needed.

Real service smoke check on 2026-09-18: source loaded, all 30 schemas and 1126
objects read; billing.doc_contract_invoice loaded with 38/38 columns. Real POST
scan returned 30 schemas, 1103 tables, 23 views, 14949 columns, 1017 primary keys,
2635 foreign keys, duration 10954 ms. Source and schemas refreshed afterward.
All 15 tests, lint, TypeScript check and production build passed. A request with
`Origin: http://localhost:3000` returned HTTP 200 and matching
`Access-Control-Allow-Origin`. Interactive browser QA was not run.

Semantic verification adds 16 tests (31 total) covering partial PATCH mapping,
null clearing, false booleans, technical-field protection, dirty/revert, unchanged
Save, 120-column selective saving, backend normalization, partial errors and
retries, 404/422/network errors, duplicate Save, Cancel/Continue for table/schema/
scan/refresh/navigation, pending confirmations and mock save-error regression.
Final verification on 2026-09-19: all 31 tests, npm run lint, npm run typecheck,
and npm run build passed.

Real PATCH smoke test completed for table 35 and column 10795: temporary business
names were PATCHed and verified by GET. Both original semantic values were
restored and all three semantic fields were verified by GET afterward. A recovery
record was written to the OS temp directory before mutation. This check is opt-in
and is not part of npm test:

```sh
node --env-file=.env --import ./tests/register-vue.mjs tests/manual-auth-smoke.mjs
```

Manual browser QA checklist (Chrome results are recorded in the verification report):

- Edit a table name and one column; confirm Save enables and technical fields stay read-only.
- Save; verify loading, success, persisted values after reload, and disabled clean Save.
- Clear text and toggle AI off; verify persistence after reload.
- Edit, then switch table/schema or scan: Cancel keeps edits; Continue discards them.
- Edit, then navigate away or reload: verify the unsaved-changes warning.
- Stop backend, attempt Save, and retry after restart; verify drafts survive the error.
- In mock mode, use `?mock=save-error` to verify retry and partial success.
- Check search/filter, pagination, narrow layouts, dark mode and keyboard modal controls.
