# Tool reference

All network records come from Scopus/Elsevier. The server is read-only. Software is free under MIT; access rights to data/views are separate. Credentials are configured through environment variables, never tool arguments.

## Common parameters and response states

- Search `query`: 1–2000 characters of the appropriate Scopus query language.
- Search `start`: 0–4999, default 0. `count`: 1–25, default 10. Follow `next_start`, not an assumed increment. Cursor pagination is available for document search if authorized.
- Author/affiliation references: numeric string up to 20 digits or an exact HTTPS Scopus profile URL. Numeric strings preserve leading zeros. Arbitrary hosts, credentials and nonstandard ports are rejected.
- `source`, `provider`, `fetched_at`, `cache_expires_at`, `cached` and `quota` describe an upstream read. Composite results carry per-view/page observations.
- Missing provider data is `null`/`not_returned`, never an invented zero. Errors are MCP `isError: true` with text JSON `{error:{code,message,retry_after_seconds?},data_absence_confirmed:false}`. SDK argument rejection can be a protocol invalid-params error instead.
- Some composite/batch calls succeed partially. Always inspect `ok`, `complete`, `comparison_complete`, `errors` and view attempts before presenting a complete result.

## Profiles

| Tool | Parameters | Result/behavior |
|---|---|---|
| `search_authors` | `query`, `start`, `count`, `sort=name\|documents_desc` | Candidate IDs, names, reported document counts, affiliations, subjects |
| `author_profile` | `author`, `view=AUTO\|LIGHT\|STANDARD\|ENHANCED\|METRICS` | Full normalized profile; AUTO is the default |
| `author_metrics` | `author` | Five provider metrics, field states and view observations |
| `author_affiliations` | `author` | Current and historical profile affiliations |
| `author_documents` | `author`, `start`, `count`, `sort` | AU-ID document query |
| `author_coauthors` | `author`, `start`, `count` | Official `co-author` Author Search parameter |
| `author_citing_documents` | `author`, `start`, `count` | REFAUID document query; entitlement-dependent |
| `search_affiliations` | `query`, `start`, `count`, `sort=relevance\|name\|documents_desc` | Organization candidates |
| `affiliation_profile` | `affiliation`, `view=AUTO\|LIGHT\|STANDARD` | Organization record, provider counts, names/location |
| `affiliation_authors` | `affiliation`, `start`, `count` | AF-ID author query; may include historical associations |
| `affiliation_documents` | `affiliation`, `start`, `count`, `sort` | AF-ID document query |
| `compare_authors` | `profiles`: 2–5 references | Distinct IDs required; per-profile failures retained |
| `compare_affiliations` | `profiles`: 2–5 references | Same behavior for organizations; no ranking inferred |
| `get_profiles_batch` | `profile_type=author\|affiliation`, `profiles`: 1–10 references | De-duplicates IDs, exposes success/error independently |
| `publication_trend` | `entity_type=author\|affiliation`, `entity`, `year_from`, `year_to` | 1–10 consecutive years, one total-count request per year |

Document `sort` is `relevance` (default), `newest`, `oldest` or `citations_desc`. Author sorting defaults to `name`, affiliation sorting to `relevance`.

AUTO author reads ENHANCED, then STANDARD, then LIGHT only while earlier attempts return ACCESS_DENIED. Once a profile succeeds, it tries METRICS if any exposed metric is still missing. Values are combined only for the same resolved Scopus ID. A denied METRICS request does not discard a valid profile. Authentication failures do not trigger view retries. Explicit view requests fail explicitly if denied.

Profile fields are bounded for MCP context: at most 30 name variants, 60 subject areas, and 100 affiliations per source section. A normalized profile is a selected-field representation, not a lossless dump of every Elsevier field. Name-only identity matching, current employment verification and university rankings are outside the API claims made by this server.

## Documents, journals and subjects

| Tool | Parameters | Result/behavior |
|---|---|---|
| `search_documents` | `query`, `start`, `count`, `sort`, `view=STANDARD\|COMPLETE`, optional `cursor` | Supports a literal `*` initial cursor and returned tokens. Cursor requires start=0. COMPLETE is limited to 25 and may be restricted |
| `document_details` | `identifier`, `identifier_type=scopus_id\|eid\|doi\|pubmed_id`, `view=META\|META_ABS\|FULL` | Defaults to Scopus ID and META_ABS; abstract availability remains explicit |
| `document_references` | same identifier/type, `start`, `count` | REF view with `startref`/`refcount`; unresolved references keep null IDs |
| `document_citing` | `eid`, `start`, `count` | REFEID search, not reference-list retrieval |
| `search_facets` | `query`, `dimensions` (1–5) | Default pubyear/subjarea; 20 requested buckets per dimension |
| `search_journals` | `title` (1–200 chars), `start`, `count` | ENHANCED serial metadata and dated provider metrics |
| `subject_areas` | `start` (0–1000, default 0), `count` (1–500, default 100), optional 4-digit `code` | Public subject-classification endpoint; local paging over returned taxonomy |
| `export_documents` | `scopus_ids` (1–10 numeric IDs), `format=bibtex\|ris\|csv` | Returns text and filename, does not write files. Records that fail are listed in `errors` |

Facet dimensions: `pubyear`, `af-id`, `au-id`, `authname`, `country`, `subjarea`, `language`, `openaccess`, `srctype`. The normalized facet structure is bounded to five nested levels, 50 elements per array, 30 properties per object and 500 characters per string. It is not an exhaustive aggregation table.

Document normalization caps abstracts at 12,000 characters, author lists at 100 and keywords at 100. References may have no title/DOI in the provider response. A missing container is `not_returned_in_view`; a present empty container remains distinct. Export includes bibliographic metadata, not full text; missing authors are omitted rather than invented. CSV cells are protected against spreadsheet formulas and RIS/BibTeX control characters are escaped.

An offset search is limited by provider result-window rules. Cursor access and cited-by searches may require extra permissions. Missing or partial pagination tokens must not be interpreted as proof that no further records exist.

## Configuration and query building

`scopus_status`: no arguments; no network. Reports boolean credential flags and last observed per-API quota only. It does not display secrets or certify universal entitlement.

`check_scopus_access`: optional `apis` array containing `authors`, `affiliations`, `documents`; defaults to all three. Issues one small search per selected API. A search success does not verify profile retrieval, METRICS or REF access.

`build_scopus_query`: required `target=authors\|affiliations\|documents`; supported structured fields:

| Target | Accepted fields |
|---|---|
| authors | `name` (surname), `first_name`, `affiliation_name`, `author_id`, `affiliation_id`, `orcid` |
| affiliations | `name` (institution), `affiliation_name`, `affiliation_id` |
| documents | `name` (author surname), `first_name`, `affiliation_name`, `author_id`, `affiliation_id`, `keywords`, `country`, `year_from`, `year_to` |

At least one condition is required. Literal fields reject quotes, braces, backslashes and control characters. ORCID checksum is validated. Use the search tools' advanced `query` directly for Boolean expressions beyond these structured fields. The builder is local and does not validate that a record exists.

## Error codes

`SCOPUS_API_KEY_REQUIRED`, `AUTHENTICATION_FAILED`, `ACCESS_DENIED`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `NOT_FOUND`, `UPSTREAM_QUERY_ERROR`, `UPSTREAM_HTTP_ERROR`, `UPSTREAM_NETWORK_ERROR`, `UPSTREAM_TIMEOUT`, `UPSTREAM_NON_JSON`, `UPSTREAM_INVALID_JSON`, `UPSTREAM_INVALID_ENCODING`, `UPSTREAM_SERVICE_ERROR`, `UPSTREAM_SCHEMA_CHANGED`, `UPSTREAM_ENTRY_ERROR`, `AMBIGUOUS_PROFILE`, `PROFILE_CHANGED`, `INVALID_IDENTIFIER`, `INVALID_QUERY_TERM`, `INVALID_ARGUMENTS`, `BUSY`, `RESPONSE_TOO_LARGE`.

A 404 is a provider response for that request, not proof that the person or organization does not exist. Batch and export can also report NOT_ATTEMPTED/BATCH_TIME_LIMIT. No inaccessible field is filled from another database, an old screenshot or a guessed value.
