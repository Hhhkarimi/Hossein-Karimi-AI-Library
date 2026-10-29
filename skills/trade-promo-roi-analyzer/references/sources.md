# منابع پایه و حدود استفاده

بررسی پیوندها: ۲۹ اکتبر ۲۰۲۶. این بسته استاندارد حسابرسی قانونی یا گواهی مستقل نیست. قواعد مالی آن تعاریف عملیاتی تحلیل هستند و باید با سیاست حسابداری سازمان تطبیق یابند.

- Hyndman & Athanasopoulos، Forecasting: Principles and Practice، فصل ۵، بخش‌های ارزیابی پیش‌بینی، اعتبارسنجی سری زمانی و بازه‌های پیش‌بینی:
  https://otexts.com/fpp3/toolbox.html
  مبنا برای ترتیب زمانی آموزش/آزمون و تمایز پیش‌بینی نقطه‌ای از عدم‌قطعیت. طراحی موتور و حداقل‌های آن انتخاب همین بسته‌اند و استاندارد توصیه‌شده کتاب محسوب نمی‌شوند.
- همان کتاب، فصل ۱۲، بخش bootstrapping:
  https://otexts.com/fpp3/advanced.html
  مبنا برای توجه به وابستگی زمانی در resampling؛ پیاده‌سازی residual moving-block این بسته، کپی پیاده‌سازی کتاب یا تضمین پوشش نیست.
- World Bank DIME، Difference-in-Differences:
  https://dimewiki.worldbank.org/Difference-in-Differences
  مبنا برای طراحی گروه مقایسه و فرض روندهای موازی. موتور موجود DiD پیاده‌سازی نمی‌کند.
- World Bank، Revisiting the Difference-in-Differences Parallel Trends Assumption: Part I:
  https://blogs.worldbank.org/en/impactevaluations/revisiting-difference-differences-parallel-trends-assumption-part-i-pre-trend
  درباره محدودیت تفسیر آزمون روند پیشین. ردنشدن آزمون، اثبات فرض نیست.
- statsmodels، robust covariance documentation (برای تحلیل سفارشی، نه وابستگی موتور):
  https://www.statsmodels.org/stable/generated/statsmodels.regression.linear_model.OLSResults.get_robustcov_results.html
  HAC و cluster باید با ساختار نمونه و واحد تخصیص سازگار باشند. وجود گزینه نرم‌افزاری، طراحی شناسایی را معتبر نمی‌کند.

هیچ ادعای عددی درباره نرخ معمول افزایش فروش، ROI صنعت یا طول جهانی پس‌دوره از این منابع استخراج نشده است. برای برآورد پیشرفته یا روش‌های DiD با زمان‌بندی متفاوت، مقاله/مستندات اولیه روش منتخب را در همان اجرا بررسی کن.

