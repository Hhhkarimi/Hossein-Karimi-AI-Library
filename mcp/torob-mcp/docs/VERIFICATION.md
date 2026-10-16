# گزارش بررسی نسخهٔ 0.1.0

تاریخ: ۲۰۲۶/۱۰/۱۵ — محیط: Windows، Node.js 24.18.0.

| بررسی | نتیجه |
| --- | --- |
| TypeScript strict build | موفق |
| npm test | 25 آزمون؛ 0 شکست |
| HTTP واقعی روی loopback با کلاینت رسمی MCP | handshake، فهرست ۱۰ ابزار و فراخوانی هر ۱۰ ابزار با ترب زنده موفق |
| خطای مرجع نامعتبر کالا | خطای صریح بدون درخواست به دامنهٔ دلخواه |
| stdio با streamهای واقعی Node | initialize، tools/list و tools/call موفق |
| اجرای CLI واقعی stdio از PowerShell | initialize، ۱۰ ابزار، پیشنهاد عبارت از ترب زنده موفق |
| سازگاری با initialize نسخهٔ 2025-11-25 | موفق؛ دریافت JSON/SSE مطابق پاسخ SDK |
| Host، Origin، bearer و سقف بدنه | موفق در آزمون listener واقعی Node |
| Worker handler و secret | موفق در آزمون Node |
| Worker bundle با esbuild و شرایط workerd/browser | موفق |
| استقرار و اجرای واقعی Cloudflare | انجام نشده |
| ساخت image با Docker | انجام نشده |

آزمون‌های مصنوعی مواردی مانند تومان، تطبیق ناقص جست‌وجو، تبلیغات، بودجه، وضعیت نامعلوم موجودی، فروشندگان ناقص، ورودی‌های نامعتبر، تفاوت مشخصات، خطای جزئی batch، cache و انقضا، صف، timeout، 403/429 و پاسخ نامعتبر را پوشش می‌دهند. دادهٔ آزمون‌ها ساختگی است.

اجرای زندهٔ آخر: 2026-10-15T16:53:13.959Z تا 2026-10-15T16:53:20.422Z (UTC). نتیجه فقط اتصال از همین میزبان را تأیید می‌کند؛ دسترسی API مستندنشده از میزبان‌های دیگر باید دوباره بررسی شود.

[گزارش JSON اجرای زنده](verification/live-http.json)، [گزارش آزمون‌ها](verification/unit-tests.xml)، [گزارش CLI stdio](verification/stdio-cli.json).

دستورهای بازتولید:

```sh
npm ci --ignore-scripts
npm test
npm run verify:live
```

برای آزمون استقرار، MCP_URL و در صورت نیاز MCP_TOKEN را تنظیم کنید. برای stdio: node scripts/verify-live.mjs --stdio. سرویس روی اینترنت منتشر نشده و تنظیمات کلاینت کاربر تغییر نکرده است.
