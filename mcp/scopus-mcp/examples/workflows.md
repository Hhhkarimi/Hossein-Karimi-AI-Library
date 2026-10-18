# گردش‌کارهای نمونه

## پیدا کردن پژوهشگر

```json
{"name":"build_scopus_query","arguments":{"target":"authors","name":"Karimi","first_name":"Hossein"}}
{"name":"search_authors","arguments":{"query":"AUTHLASTNAME(Karimi) AND AUTHFIRST(Hossein)","count":10}}
```

پاسخ نام، حوزه و وابستگی را بررسی کنید؛ نام یکسان به معنی شخص یکسان نیست. `AUTHOR_ID_FROM_SEARCH` در مثال‌های بعد باید با یک ID واقعی از پاسخ جایگزین شود.

```json
{"name":"author_profile","arguments":{"author":"AUTHOR_ID_FROM_SEARCH","view":"AUTO"}}
{"name":"author_metrics","arguments":{"author":"AUTHOR_ID_FROM_SEARCH"}}
{"name":"author_affiliations","arguments":{"author":"AUTHOR_ID_FROM_SEARCH"}}
{"name":"author_documents","arguments":{"author":"AUTHOR_ID_FROM_SEARCH","sort":"newest","count":10}}
{"name":"author_coauthors","arguments":{"author":"AUTHOR_ID_FROM_SEARCH","count":10}}
```

اگر h-index گزارش نشد، `view_attempts` و `metric_status` را بخوانید. خطای مجوز را «پژوهشگر h-index ندارد» تعبیر نکنید.

## پیدا کردن دانشگاه

```json
{"name":"search_affiliations","arguments":{"query":"AFFIL(University of Tehran)","count":10}}
```

دانشگاه و زیرمجموعه‌های آن ممکن است چند شناسه داشته باشند. ID مناسب را از نتیجه انتخاب کنید و `AFFILIATION_ID_FROM_SEARCH` را جایگزین کنید:

```json
{"name":"affiliation_profile","arguments":{"affiliation":"AFFILIATION_ID_FROM_SEARCH"}}
{"name":"affiliation_authors","arguments":{"affiliation":"AFFILIATION_ID_FROM_SEARCH","count":25}}
{"name":"affiliation_documents","arguments":{"affiliation":"AFFILIATION_ID_FROM_SEARCH","sort":"citations_desc","count":10}}
{"name":"publication_trend","arguments":{"entity_type":"affiliation","entity":"AFFILIATION_ID_FROM_SEARCH","year_from":2021,"year_to":2025}}
```

فهرست پژوهشگران می‌تواند شامل وابستگی‌های تاریخی باشد. برای نسبت‌دادن وابستگی جاری، پروفایل فرد را بررسی کنید؛ از این فهرست، عنوان «کارکنان فعلی» نسازید.

## مقایسه و صفحهٔ بعد

```json
{"name":"compare_authors","arguments":{"profiles":["FIRST_AUTHOR_ID","SECOND_AUTHOR_ID"]}}
{"name":"compare_affiliations","arguments":{"profiles":["FIRST_AFFILIATION_ID","SECOND_AFFILIATION_ID"]}}
```

برای صفحهٔ بعد، `next_start` پاسخ را استفاده کنید. در جست‌وجوی اسناد با cursor، ابتدا `cursor:"*"` و سپس `next_cursor` پاسخ را بفرستید. تغییر query هنگام استفاده از cursor می‌تواند نتیجه را نامعتبر کند.

## بررسی دسترسی

```json
{"name":"scopus_status","arguments":{}}
{"name":"check_scopus_access","arguments":{"apis":["authors","affiliations"]}}
```

اطلاعات وضعیت، خود کلید را نشان نمی‌دهد. موفقیت جست‌وجو، تضمین دسترسی به نمای METRICS یا REF نیست. کلید یا توکن را در query یا آرگومان ابزار وارد نکنید.

## دریافت DOI و خروجی

```json
{"name":"document_details","arguments":{"identifier":"10.1234/replace-with-a-real-doi","identifier_type":"doi","view":"META_ABS"}}
{"name":"export_documents","arguments":{"scopus_ids":["SCOPUS_DOCUMENT_ID"],"format":"ris"}}
```

DOI و شناسهٔ بالا placeholder هستند و باید جایگزین شوند. خروجی صادرات متن است؛ سرور روی فایل‌های کلاینت چیزی نمی‌نویسد. در پاسخ نهایی، خطاهای رکوردها، منبع Scopus و زمان دریافت را حفظ کنید.
