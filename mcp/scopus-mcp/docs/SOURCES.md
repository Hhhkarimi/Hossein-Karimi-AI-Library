# Sources and verification boundaries

Documentation reviewed on **2026-10-19 (Asia/Tehran)**. Some old `guides/*.htm` and `tips/*.htm` URLs redirect in JavaScript; direct documentation pages are linked below.

| Source | Used for |
|---|---|
| [Elsevier API portal](https://dev.elsevier.com/) | Current entitlement policy: possessing an API key is not a universal data-access grant |
| [API key settings](https://dev.elsevier.com/api_key_settings.html) | Per-API quotas, rate-limit headers, access-controlled services |
| [Authentication](https://dev.elsevier.com/tecdoc_api_authentication.html) | API key and institutional token headers |
| [Author Search API](https://dev.elsevier.com/documentation/AuthorSearchAPI.wadl) | Search parameters, the explicit `co-author` route, sorts and pagination |
| [Author search language](https://dev.elsevier.com/sc_author_search_tips.html) | AU-ID, AF-ID, AUTHLASTNAME, AUTHFIRST, AFFIL, ORCID |
| [Author Retrieval API](https://dev.elsevier.com/documentation/AuthorRetrievalAPI.wadl) | Official author-profile endpoint and retrieval views |
| [Author retrieval views](https://dev.elsevier.com/sc_author_retrieval_views.html) | Metrics and affiliation field availability by view |
| [Affiliation Search API](https://dev.elsevier.com/documentation/AffiliationSearchAPI.wadl) | Organization lookup and sorts |
| [Affiliation query language](https://dev.elsevier.com/sc_affil_search_tips.html) | Organization query fields and identifiers |
| [Affiliation Retrieval API](https://dev.elsevier.com/documentation/AffiliationRetrievalAPI.wadl) | Organization profiles, counts and supported views |
| [Affiliation retrieval views](https://dev.elsevier.com/sc_affil_retrieval_views.html) | Profile and count fields; absence of a promised institutional ranking field |
| [Scopus Search API](https://dev.elsevier.com/documentation/ScopusSearchAPI.wadl) | Document search, sorts, facets and result metadata |
| [Scopus query language](https://dev.elsevier.com/sc_search_tips.html) | AU-ID, AF-ID, title/abstract/keyword and publication-year queries |
| [Abstract Retrieval API](https://dev.elsevier.com/documentation/AbstractRetrievalAPI.wadl) | Numeric/EID/DOI/PMID retrieval and REF pagination |
| [Serial Title API](https://dev.elsevier.com/documentation/SerialTitleAPI.wadl) | Journal metadata and metric-year fields |
| [Subject Classifications API](https://dev.elsevier.com/documentation/SubjectClassificationsAPI.wadl) | The public Scopus subject endpoint and filters |
| [Scopus Preview](https://www.elsevier.support/scopus/answer/what-is-scopus-preview) | Free human-facing preview is distinct from unrestricted API entitlement |
| [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | Protocol, stdio and HTTP transports |

The official linked JSON examples for author search/retrieval, affiliation search/retrieval, document search/retrieval and serial titles were used to check parser compatibility. They are documentation fixtures, not current profile measurements. Full source examples have not been copied into the repository; repository test fixtures are synthetic.

No authorized Elsevier key was configured in the build environment. Anonymous Author Retrieval returned HTTP 401. Public author/affiliation profile pages could not be retrieved from this environment. Neither observation establishes that the profile is absent. The public subject classification endpoint returned HTTP 200 and was exercised through both transports.

The server exposes a selected, bounded set of documented Scopus workflows. Citation Overview, SciVal analytics, institutional rankings, account management, profile corrections, bulk mirroring and subscription full-text retrieval are not implemented. A comprehensive tool list does not imply coverage of every Elsevier product or unrestricted access to all Scopus fields.

No network data is silently drawn from a different research database. Alternate official views are attempted only with the user's own configured API credentials and are disclosed. The application does not request purchases or invoke billable external scraping services. Running code has no software license fee; upstream data entitlement and any hosting costs remain separate.
