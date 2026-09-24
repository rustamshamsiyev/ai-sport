# DATA COLLECTION STATISTICS FRONTEND v1

Verified 2026-09-23 against the running FastAPI OpenAPI and real backend.

## Implementation

`/data-collection` has **Ma'lumotlar bazasi** and **Statistika** segment buttons.
Database is the initial view and remains mounted across tab switches: selection,
search, unsaved drafts and navigation/logout guards are preserved. Statistics
loads lazily and reloads on every entry, including after a Save or scan. Its tab
is disabled while database actions are busy.

Six summary cards show global totals; table/view/column cards include AI counts.
Schema rows are also global. Filters affect only objects. The backend provides
all real values; no real counts are hardcoded. Numbers use Intl.NumberFormat.
Null business names show an em dash; false and zero remain intact.

Objects use backend schema/type/AI/search filters and pagination (50 default,
100 or 200). Search follows the contract: literal case-insensitive substring of
schema.table or business_name, max 300 characters, debounced 300 ms. Filters reset
page to 1. No full-list prefetch or client filtering occurs in real mode.
Schema choices come from the same statistics response, without additional calls.

Refresh/Retry issue GET statistics, never scan. First load has placeholders;
later loads preserve global summary/schema data and hide stale object rows.
Empty results preserve global totals. Cards and filters wrap; tables scroll
horizontally; existing light/dark tokens are reused.

The isolated statistics state versions requests: stale success, errors and
completion cannot overwrite newer filters. Typing invalidates immediately before
debounce. Identical concurrent loads share a promise. Disposal cancels debounce
and ignores pending responses. Metadata state is not reset or modified.

`metadata.read` is checked before requests; denial makes no API call. Existing
auth transport attaches Bearer and handles 401. A 403 preserves authentication.
Errors are safe messages, never raw backend bodies. Backend remains authoritative.
Explicit mock mode derives statistics only from the existing mock snapshot;
default real mode always uses the API.

## Mapping

`databaseService.getStatistics(params)` uses the existing configured auth-aware
fetcher. Components contain no direct fetch calls.

| Frontend | Backend |
| --- | --- |
| schemaId, objectType, aiEnabled | schema_id, object_type, ai_enabled |
| search, page, pageSize | search, page, page_size |
| primaryKeys, foreignKeys | primary_keys, foreign_keys |
| aiEnabledTables, aiEnabledViews, aiEnabledColumns | ai_enabled_tables, ai_enabled_views, ai_enabled_columns |
| schemaId, schemaName | schema_id, schema_name |
| tableId, tableName, objectType | table_id, table_name, object_type |
| businessName, aiEnabled | business_name, ai_enabled |
| totalColumns, primaryKeyColumns, foreignKeys | total_columns, primary_key_columns, foreign_keys |
| pagination.pageSize, totalPages | pagination.page_size, total_pages |

IDs become strings. Summary schemas/tables/views/columns and pagination page/total
retain their names. Undefined filters are omitted; false AI is sent explicitly.

## Verification

| Check | Result |
| --- | --- |
| Statistics tab / API integration / Authentication / metadata.read | PASS |
| Summary schemas / tables / views / columns / PK / FK | PASS |
| AI tables / views / columns | PASS |
| Schema statistics / Object statistics | PASS |
| Schema / object type / AI selection / search filters | PASS |
| Pagination / loading / empty state / error and retry | PASS |
| Refresh / race protection / responsive / dark mode | PASS |
| Data Collection regression / authentication regression | PASS |
| Tests | PASS: 80/80 (22 new) |
| Previous 58 regression tests | PASS: 58/58 retained |
| Lint | PASS: zero errors; one pre-existing DatabaseExplorer attribute-order warning |
| TypeScript | PASS |
| Production build | PASS |
| Real backend service/state verification | PASS |
| Real browser verification | PASS |

Automated tests cover DTOs, all filters, pagination, debounce, duplicate requests,
stale responses, disposal, safe 500/422/network errors, retry/refresh, permission
denial, Bearer, 401/403, explicit mock mode and actual Vue report rendering using
independent fixture counts.

Observed real backend values (verification only, not implementation constants):

| Field | Value |
| --- | ---: |
| schemas | 30 |
| tables | 1103 |
| views | 23 |
| columns | 15024 |
| primary_keys | 1017 |
| foreign_keys | 2635 |
| ai_enabled_tables | 1 |
| ai_enabled_views | 0 |
| ai_enabled_columns | 3 |

Real Chrome checks passed: login → Data Collection → statistics, summary/schema/
object rows, all filters, search, empty results, page change, 50/100/200 sizes,
Refresh and returning to database with the unsaved local draft intact. Re-entry
made one fresh GET. At 1440, 1024 and 390 px the document had no horizontal
overflow; tables scroll independently. Light/dark screenshots were inspected.
Isolated browser checks additionally verified safe 403, session retention and
Retry. Network inspection confirmed no metadata writes or scan during these
checks. Production metadata/profile and ADMIN password were untouched.

## Reproduce

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
Read-only real smoke uses the existing ignored local .env API URL and
AUTH_SMOKE_USERNAME/AUTH_SMOKE_PASSWORD, without printing or committing secrets:

```sh
node --env-file=.env --import ./tests/register-vue.mjs tests/manual-statistics-smoke.mjs
```

Browser QA: login, open Statistika, compare totals, change each filter, try an
unmatched search, switch pages/sizes, Refresh, then return to database. Check
draft preservation, dark mode and narrow screens. Remove temporary smoke
credentials from .env when finished.

## Changed files

- app/types/statistics.ts — frontend contracts.
- app/services/statisticsAdapter.ts — DTO/query and explicit mock mapping.
- app/services/databaseService.ts and app/types/database.ts — statistics operation.
- app/composables/statisticsState.ts — isolated state and request guards.
- app/composables/useDataCollection.ts — shares the configured service.
- app/pages/data-collection/index.vue — navigation preserving database state.
- app/components/data-collection/StatisticsView.vue — controls and request states.
- app/components/data-collection/StatisticsReport.vue — summary and tables.
- app/assets/css/statistics.css — responsive statistics styles.
- tests/statistics.test.mjs — 22 automated tests.
- tests/manual-statistics-smoke.mjs — read-only real verification.
- docs/data-collection.md and this report.

Remaining issues: no blockers found. Existing lint and dependency build warnings
remain. Backend, other modules and auth architecture were not changed. No chart,
export or new permission was added.

**FINAL STATUS: PASS**
