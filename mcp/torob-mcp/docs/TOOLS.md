# Tool reference

All tools are read-only. Prices are numeric **toman**, not rial. Upstream failures return `isError: true` and a text JSON object `{ "error": { "code", "message", "retry_after_seconds"? } }`. SDK argument validation can instead produce a JSON-RPC invalid-params response. Successful calls contain both text JSON and `structuredContent`.

## Search and discovery

`search_torob`:

| Parameter | Type / default | Meaning |
| --- | --- | --- |
| `query` | string, required | 1–200 characters; Persian/English; normalized before sending |
| `page` | integer 0–99, default 0 | Zero-based upstream page |
| `limit` | integer 1–30, default 10 | Upstream requested size and output cap; ads/filtering can reduce results |
| `sort` | `relevance`, `price_asc`, `price_desc` | Default `relevance`; price order is also applied within returned results |
| `min_price_toman` | nonnegative safe integer, optional | Inclusive local minimum; upstream uses `price__gt` |
| `max_price_toman` | nonnegative safe integer, optional | Inclusive local maximum; upstream uses `price__lt` |
| `category_id` | positive integer, optional | Category from discovery/details |
| `brand_id` | positive integer, optional | Brand from discovery |
| `include_ads` | boolean, default false | Include Torob ad cards |

Minimum must not exceed maximum. Upstream boundary behavior may exclude an exact endpoint even though local checks are inclusive. The adapter does not invent additional hits to compensate. `next_page` is null when Torob has no next page. No stable cursor or cross-page snapshot is promised.

`torob_suggest`: required `query` (1–200 chars), optional `limit` (1–20, default 10).

`search_filters`: required `query` (1–200 chars), optional `category_id` (positive integer). Returns up to 30 attribute groups, 60 options per group, categories and estimated min/max price. Arbitrary attribute slugs cannot be sent back as tool parameters.

`browse_category`: required `category_id`; optional `page` (0–99, default 0), `limit` (1–30, default 10), `sort` (same enum), `include_ads` (default false).

## Products and offers

`product` always means a product UUID or an HTTPS URL with hostname exactly `torob.com` / `www.torob.com` and path `/p/<UUID>/...`. Credentials, nonstandard ports, HTTP, unrelated domains and arbitrary API URLs are rejected.

`product_details`: required `product`. Returns a product card, up to 60 specification rows and up to five non-ad online offer previews. The preview is explicitly partial. Keep both specification sources when values conflict.

`product_sellers`:

| Parameter | Type / default | Meaning |
| --- | --- | --- |
| `product` | required reference | Product UUID or URL |
| `shop_type` | `online` (default), `offline` | Separate upstream seller groups |
| `limit` | integer 1–50, default 15 | Output cap after sorting/filtering |
| `include_ads` | boolean, default false | Include promoted offers |
| `available_only` | boolean, default true | Excludes explicit unavailability and missing/zero prices; unknown availability remains null |

The adapter loads `sellers_url` when supplied, validates the exact API origin/path/product, deduplicates offer UUIDs and sorts by listed price. A shop can have multiple offers. A raw upstream count can also include duplicates. `loaded_list_complete` uses the raw loaded count; `loaded_offers` counts unique offer UUIDs. Offline contact APIs are never followed. For offline stores, use the parent product URL to inspect details in Torob.

`similar_products`: required `product`; optional `limit` (1–30, default 10), `include_ads` (false).

`get_products_batch`: required `products`, array of 1–10 references. Duplicate UUIDs are coalesced. Each entry has `ok: true` plus product, or `ok: false` plus error. A block stops remaining requests and marks them `SKIPPED_UPSTREAM_BLOCKED`.

`compare_products`: required `products`, array of 2–5 references, at least two distinct UUIDs. Returns product prices and only differing specification rows, up to 60. Missing values are null. A failed detail request fails comparison rather than silently omitting a product. This is not a recommendation score.

`find_cheapest`: required `query`; optional `min_price_toman`, `max_price_toman`, `category_id`, `brand_id`; optional `limit` (1–20, default 5) and `pages` (1–3, default 2). Starts at page 0 with 30 results per page, excludes ads, removes duplicate products and ranks listed numeric prices. Exposes scanned pages and timestamps. Low-confidence matches remain labelled, not silently treated as exact models.

## Errors

| Code | Meaning |
| --- | --- |
| `INVALID_PRODUCT`, `INVALID_PRODUCTS`, `INVALID_QUERY`, `INVALID_ARGUMENTS` | Invalid request; fix parameters |
| `NOT_FOUND` | HTTP 404 from upstream |
| `UPSTREAM_BLOCKED` | 401/403/429 or active upstream cooldown; respect delay |
| `UPSTREAM_TIMEOUT` | Request/body exceeded 12-second timeout |
| `UPSTREAM_NETWORK_ERROR`, `UPSTREAM_HTTP_ERROR` | Network or non-success response |
| `UPSTREAM_NON_JSON`, `UPSTREAM_INVALID_JSON` | Unexpected format/challenge |
| `UPSTREAM_SCHEMA_CHANGED` | JSON no longer fits the adapter contract |
| `UPSTREAM_RESPONSE_TOO_LARGE` | Response exceeded 5 MB |
| `BUSY` | 32 distinct upstream requests already queued |

No error is converted to an empty successful product list. For slow multi-product requests, a client timeout of 120 seconds can be useful; the verifier uses it explicitly.
