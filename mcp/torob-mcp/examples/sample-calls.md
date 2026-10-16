# نمونهٔ استفاده

۱. عبارت مبهم: «گوشی سامسونگ سری A می‌خواهم.»

```json
{"name":"torob_suggest","arguments":{"query":"سامسونگ a"}}
{"name":"search_filters","arguments":{"query":"گوشی سامسونگ"}}
```

۲. بودجه: شناسهٔ دسته و برند را از پاسخ قبلی بگیرید. عدد بودجه مثال است:

```json
{"name":"search_torob","arguments":{"query":"سامسونگ a56","max_price_toman":150000000,"sort":"price_asc","limit":5}}
{"name":"find_cheapest","arguments":{"query":"سامسونگ a56","max_price_toman":150000000,"pages":2,"limit":5}}
```

۳. فروشندگان: `PRODUCT_UUID_FROM_SEARCH` را با یک `id` واقعی جایگزین کنید:

```json
{"name":"product_details","arguments":{"product":"PRODUCT_UUID_FROM_SEARCH"}}
{"name":"product_sellers","arguments":{"product":"PRODUCT_UUID_FROM_SEARCH","shop_type":"online","limit":10}}
{"name":"product_sellers","arguments":{"product":"PRODUCT_UUID_FROM_SEARCH","shop_type":"offline","limit":10}}
```

۴. مقایسه: دو شناسهٔ متفاوت از جست‌وجو بگیرید:

```json
{"name":"compare_products","arguments":{"products":["FIRST_PRODUCT_UUID","SECOND_PRODUCT_UUID"]}}
```

پاسخ نهایی به خریدار باید لینک کالا، زمان دریافت، قیمت تومان، وضعیت نو/کارکرده و محدودیت پوشش را مشخص کند. برای فروشنده، هزینهٔ ارسال و شرایط رجیستری یا گارانتی را از روی عنوان و توضیحات همان پیشنهاد بررسی کنید. کمترین قیمت مشاهده‌شده به‌تنهایی معیار بهترین خرید نیست.
