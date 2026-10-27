# Source and implementation notes

Reviewed 2026-10-26 (Asia/Tehran). Runtime fetches only the first-party public pages below. There is no dependency on the blocked TAAFT site or any third-party scraping service.

- [FutureTools directory](https://futuretools.io/tools): visible result cards, result range/total, pagination, category/filter controls and public JSON render data.
- [Example detail page](https://futuretools.io/tools/claude): visible description/facts, SoftwareApplication JSON-LD and breadcrumb identity. This link is a reproducible parser example, not an endorsement.
- [Filtered public directory](https://futuretools.io/tools?search=research&filters=free&sort=popular): query/filter/sort contract.
- [robots.txt](https://futuretools.io/robots.txt): the observed response allowed `/` and disallowed `/go/`, `/admin`, `/api/`, `/auth/`. Runtime requests none of those disallowed paths.
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk): official protocol implementation for stdio and Streamable HTTP.
- [Cheerio](https://cheerio.js.org/): HTML traversal; page scripts are not executed.
- [ExcelJS](https://github.com/exceljs/exceljs): open-source runtime XLSX writing/readback; no paid document service.

Public UI code confirmed URL parameters `search`, `categories`, `filters`, `sort`, `page`; filters `free`, `freemium`, `paid`, `open_source`, `matts_picks`; orders `newest`, `oldest`, `popular`, `popular_30d`, `name`. Only these observed public controls are exposed. No internal API keys or private endpoints are extracted or used.

The directory parser accepts only visible result-card slugs with matching public render records. Ads and unrelated recommendations are excluded. Public render state is compared to requested filters. Detail identity must match the actual returned page. Changes to HTML/render data can require a parser update and will be reported explicitly.

The software license covers code. Rights to directory content, linked products and third-party marks remain with their owners. This repository does not bundle a copy of the full live catalog. Test fixtures are fictional and carry synthetic names/URLs; the live verification report contains checks and counts, not a redistributed directory.
