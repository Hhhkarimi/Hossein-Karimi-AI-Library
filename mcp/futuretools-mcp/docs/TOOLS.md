# FutureTools MCP tool reference

All network data comes from the public FutureTools website. No API key, login, paid proxy, browser or model API is used. These are unofficial HTML/render-data adapters, not a claim of an official FutureTools API. Source data is read-only; exports create local/in-memory files.

## Discovery

| Tool | Inputs | Result |
|---|---|---|
| `futuretools_status` | none | Configuration/cache/cooldown; no network and no proof of access |
| `check_access` | none | One recognized directory read; proves only that page at its fetch time |
| `search_tools` | `query`, `categories`, `filters`, `sort`, `page` | One page, applied state, reported total and next page |
| `list_categories` | none | Current names and exact category slugs; no guessed counts |
| `category_tools` | `category`, optional filters/sort/page | Browse a category |
| `latest_tools` | optional query/categories/page | Directory order `newest` |
| `popular_tools` | optional query/categories/page, `period=all_time|30_days` | `popular` or `popular_30d` |
| `free_tools` | optional query/categories/page/sort | Official `free` filter |
| `open_source_tools` | optional query/categories/page/sort | Official `open_source` filter |
| `editors_picks` | optional query/categories/page/sort | Official `matts_picks` filter |

Search query: 0–300 characters, default empty. Categories: at most 5 exact slugs. Filters: at most 5 from `free`, `freemium`, `paid`, `open_source`, `matts_picks`. Sort: `newest` (default), `oldest`, `popular`, `popular_30d`, `name`. Page: 1–1000, default 1. Unknown fields are rejected. Use `next_page` and inspect `returned`/`total_results`; never present one page as the whole catalog. Filter combinations follow upstream semantics. Server-returned initial filter state must match the request. Range mismatch, unrecognized layout or inconsistent card data fails explicitly.

## Details and comparisons

| Tool | Inputs | Result |
|---|---|---|
| `get_tool` | `tool` | Detail overview, vendor URL, directory labels, votes, API/open-source flags when reported |
| `get_tools_batch` | `tools`: 1–10 references | Deduplicated reads; partial errors and unattempted items |
| `compare_tools` | `tools`: 2–5 references | At least 2 distinct tools; reported facts and source times |
| `find_alternatives` | `tool`, optional `category`, `filters`, `limit=1..20` | Same-category heuristic, excluding the seed |

References are exact lowercase slugs or HTTPS `futuretools.io/tools/slug` URLs (www input is normalized). Arbitrary hosts, embedded credentials, nonstandard ports and query/hash references are rejected. Same-origin canonical redirects are disclosed with `requested_slug` and `resolved_to_different_slug`. No vendor pages or tracking redirects are requested.

Detail metadata comes from matching H1, SoftwareApplication JSON-LD, breadcrumb identity and visible facts. Missing booleans remain null; false is retained when explicitly reported. Month-only listed text is preserved without inventing an exact date. Combined category labels/links on some detail pages are returned literally. They are not split into guessed categories. The alternatives tool resolves an exact matching search card for category selection, or accepts an explicit category; if unresolved it returns `needs_category`.

Alternatives use one popular category page, not a global ranking or an official alternatives list. `returned` counts the actual selected alternatives; `candidates_on_page` is the upstream page count. Popular order is the source's order. Upvotes are not a quality score or necessarily a 30-day count. Directory pricing is not independently verified current vendor pricing.

Normalization bounds: card descriptions 3,000 characters, detail descriptions 12,000, category arrays 30, search tags 30 × 120 characters, videos 10. A normalized record is a selected-field representation, not a lossless website archive.

## Export

`export_tools` requires exactly one of:

- `tools`: 1–10 tool references, loaded as details;
- `search`: the same structured object accepted by `search_tools`, including an empty object for the default directory.

Other inputs: `format=xlsx|csv|json` (default xlsx), `max_pages=1..5` (default 1), `include_details=false` (search-card enrichment only). Each live page has up to 24 cards; maximum 120 cards per query export. New group/page/detail requests stop after a soft 35-second budget or a blocking access/rate/network failure; a request already in flight can finish after that budget. Earlier records remain and partial errors are disclosed. No automatic exhaustive catalog download is performed.

Result fields include `exported`, `reported_total`, `pages_read`, `selection_complete`, `entire_query_complete`, `scope`, `errors`, `created_at`, `filename`, `mime_type`, `size`, `resource_uri`, `expires_at` and an MCP resource_link. Query exports starting after page 1 cannot claim entire-query completeness. Selected-reference exports use selection completeness, not entire-query completeness.

- HTTP returns `download_url`, served as an attachment under the same bearer and Origin protection as MCP.
- stdio saves the file to `FUTURETOOLS_EXPORT_DIR` (default `exports/`) and returns absolute `local_path` and `file_uri`.
- Both expose bytes as a base64 blob through standard `resources/read` at the returned resource URI.

HTTP resources live at most one hour, 10 files, 32 MB total; individual files are capped at 8 MB. Restart/eviction expires them. Local disk files persist until explicitly removed by the operator. There is no arbitrary output-path tool argument. The export tool is annotated as a non-destructive local write with non-idempotent file creation. Other tools are read-only.

XLSX has Tools and Coverage sheets, a frozen header, filter row, numeric votes and literal text cells. CSV protects leading formula markers, quotes and multiline fields. JSON retains normalized records plus per-record provenance. Null metadata is not invented or replaced by a fake zero.

## Error and provenance contract

Responses preserve `source`, `source_url`, `fetched_at`, `cached`, `cache_expires_at`. Exported rows retain their page/detail provenance. Fetch time is not a guarantee of the upstream database's last internal update. Cache TTL is 120 seconds and never silently used as a fallback after an expired read fails.

MCP errors have `isError=true` and text JSON `{error:{code,message,retry_after_seconds?},data_absence_confirmed:false}`. SDK schema rejection may be an invalid-params protocol error instead. Codes include `INVALID_TOOL_REFERENCE`, `URL_NOT_ALLOWED`, `ACCESS_BLOCKED`, `RATE_LIMITED`, `PAGE_NOT_FOUND`, `UPSTREAM_HTTP_ERROR`, `UPSTREAM_TIMEOUT`, `NETWORK_ERROR`, `INVALID_ENCODING`, `RESPONSE_TOO_LARGE`, `UPSTREAM_LAYOUT_CHANGED`, `FILTER_NOT_APPLIED`, `PAGE_NOT_APPLIED`, `PAGE_OUT_OF_RANGE`, `TOOL_IDENTITY_CHANGED`, `EXPORT_FAILED`, `EXPORT_EXPIRED`.

Only a recognized page-1 query with a consistent total of zero confirms an empty result for that query at that time. Access denial, a missing field or a 404 page is not a proof that no corresponding product exists anywhere.
