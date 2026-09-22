# Frontend verification — data collection

Date: 2026-09-19. Backend: http://127.0.0.1:4000.
Frontend: http://localhost:3000/data-collection.

Verification used a separate headless Chrome profile, actual rendered Vue UI,
Chrome DevTools Protocol network observation and the real FastAPI service.
No backend code was changed. Existing unrelated workspace changes were preserved.

## Results

| Check | Status | Evidence |
| --- | --- | --- |
| Configuration | PASS | Local .env: API base 4000, mock false; Nuxt public runtimeConfig |
| Real API mode | PASS | Browser sent source/schema/table requests to FastAPI; explicit mock opt-in covered by tests |
| Source loading | PASS | Real GET, source card, delayed loading, injected 500 error and successful retry |
| Schemas | PASS | 30 real schemas, searchable dropdown and schema_id request selection |
| Tables/views | PASS | 1126 real objects read across schemas: 1103 tables and 23 views |
| Search/filter | PASS | Actual browser search, no-results, Table (350) and View (21) filtering in public |
| Pagination | PASS | public has 371 objects; 50 DOM rows; next page 51–100; filter resets page |
| Table details | PASS | Real GET /tables/35; technical name and all counts compared with response |
| Columns | PASS | Real GET /tables/35/columns; 38 rows rendered; column identity checked |
| DTO mapping | PASS | Existing mapper tests cover snake_case, null, false, schema IDs and key flags/counts |
| Table editing | PASS | Browser edited business name, description and AI flag; technical metadata stays read-only |
| Column editing | PASS | Browser edited the first column's three semantic values |
| Dirty state | PASS | Save enabled after edit; unchanged and saved states disable it; semantic-only diff/revert tests |
| Partial PATCH | PASS | Automated whitelist/partial/null/false tests; browser observed only two changed objects, no other columns |
| Save | PASS | Actual UI Save, actual PATCH, backend GET and browser reload verified persistence |
| Duplicate Save protection | PASS | Two immediate clicks generated one table PATCH and one column PATCH; controls disabled while pending |
| Unsaved changes protection | PASS | Browser Cancel/Continue for table, schema, route navigation and scan; native beforeunload registration reviewed |
| Scan | PASS | Actual POST, disabled button, indeterminate progress (no value/percentage), repeated click produced one scan |
| Refresh after scan | PASS | Browser observed source, schemas, tables, selected table and columns reloading |
| Error handling | PASS | Browser-injected 404, 422, 500 and connection failure; safe messages, draft retained, no secret/stack text |
| Tests | PASS | 31/31, including all previous regressions |
| Lint | PASS | npm run lint |
| TypeScript | PASS | npm run typecheck |
| Production build | PASS | npm run build |
| Real API smoke test | PASS | Table 35, column 10795, actual rendered UI Save and refresh |
| Test semantic data restored | PASS | Independent cleanup PATCHes restored originals; GET compared business_name, description, ai_enabled |

## Real write verification and cleanup

Before mutation, original table and column DTOs were stored in
`.cache/verification-semantic-backup.json`. Temporary business names,
descriptions and inverted AI flags were entered through the UI. Save produced
exactly two PATCH requests, each containing only the three changed semantic
fields. Backend GETs matched the temporary values. Browser reload followed by
selection showed the persisted values and a clean/disabled Save.

Cleanup restored both original semantic payloads, including exact nullable text
and booleans, and independently verified all three fields using GET. The initial
browser harness retry was caused by checking old DOM immediately after reload;
cleanup ran successfully on that attempt too. The corrected harness waited for
the new page and completed. No verification values remain in backend metadata.

## Real scan and performance observations

Actual scan returned:

- schemas: 30
- tables: 1103
- views: 23
- columns: 14949
- primaryKeys: 1017
- foreignKeys: 2635
- durationMs: 8672

All 1126 objects across 30 schemas were read through the service in 179 ms on
this local run (an observation, not a performance guarantee). Normal page flow
loads only the chosen schema; it does not prefetch every table's columns.
The public schema rendered at most 50 of 371 objects. Existing automated tests
also verify pagination for a 1101-entry response. Search/filter/pagination did
not make additional API requests. Details and columns loaded only on selection.

## Code review

- No direct API calls or hardcoded backend URL in module components.
- API requests remain in databaseService; DTO mapping is isolated there.
- Explicit mock mode is lazy-loaded; real mode never falls back to fixtures.
- Request versions ignore stale table/schema/detail responses.
- Save baseline advances separately for each successful response; partial
  failures remain dirty and retries only send failed changes.
- Save/scan guards and loading/error state tests pass.
- Error scenarios were injected in the browser; backend was not stopped and
  no intentional 500 was caused on the backend.

## Found and fixed

A real browser test found that USelectMenu kept its optimistic internal schema
value after Cancel in the unsaved-changes modal. The draft and actual schema
remained correct, but the trigger displayed the rejected schema.

Minimal fix: reset the select instance on a new selection attempt until the
parent accepts it. Verified Cancel retains both billing label and draft;
Continue changes to public and loads its 371 objects. No redesign was made.

Changed application file: app/components/data-collection/DatabaseExplorer.vue.
Verification documentation: this report and docs/data-collection.md.

Remaining functional issues: none found in the verified scope. Native browser
close/reload confirmation was reviewed in code; the route navigation modal was
exercised in Chrome. Cross-browser and sustained-load testing were not performed.

FRONTEND FINAL STATUS: PASS
