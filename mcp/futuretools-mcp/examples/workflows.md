# نمونهٔ استفاده

دستیار میزبان می‌تواند درخواست فارسی را به عبارت جست‌وجوی انگلیسی تبدیل کند. خود سرور هزینهٔ مدل یا ترجمه ندارد. نام و شناسهٔ ابزار را از نتیجهٔ واقعی بگیرید.

## ابزارهای رایگان برای پژوهش

```json
{"name":"list_categories","arguments":{}}
{"name":"search_tools","arguments":{"query":"research","categories":["research"],"filters":["free"],"sort":"popular","page":1}}
```

در صورت وجود `next_page` برای ادامه همان query و فیلترها را با آن صفحه تکرار کنید. مرتب‌سازی و برچسب‌های قیمت متعلق به FutureTools هستند.

## جزئیات و مقایسه

```json
{"name":"get_tool","arguments":{"tool":"claude"}}
{"name":"compare_tools","arguments":{"tools":["claude","chatgpt-openai"]}}
{"name":"find_alternatives","arguments":{"tool":"claude","category":"chat","limit":5}}
```

مقایسهٔ مشخصات به معنی تأیید کیفیت یا قیمت فعلی فروشنده نیست. ابزارهای مشابه از یک صفحه در دستهٔ مشترک انتخاب می‌شوند.

## تحویل واقعی فایل

```json
{"name":"export_tools","arguments":{"search":{"query":"research","filters":["free"]},"format":"xlsx","max_pages":2}}
```

مسیر `local_path` در اتصال محلی، یا `download_url` در HTTP را نمایش دهید. اگر میزبان منبع فایل MCP را پشتیبانی کند، `resource_link` و `resources/read` نیز قابل‌استفاده‌اند. تعداد خروجی، `selection_complete`، `entire_query_complete` و خطاهای جزئی را همراه فایل گزارش کنید. با داشتن یک صفحه، ادعای دریافت کل فهرست نکنید.
