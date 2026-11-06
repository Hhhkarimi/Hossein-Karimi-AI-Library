# Sector Adaptation Playbooks — Golrang-like Holding and Other Companies

Use these as **question prompts and hypothesis menus**, not as verified facts about a named business. Do not force a company into a sector without asking. Distinguish business-to-business, business-to-consumer, private label, regulated goods and service operations.

## A. FMCG manufacturing (detergents, cosmetics, personal care, food)

**Economic value tree:** conversion cost/unit, material yield, scrap/rework, quality complaints, OEE, downtime, energy intensity, SKU changeover, demand-to-production synchronization.

**Decision-probing questions** (ask one at a time, tailored):
- «بیشترین حاشیه سود از دست‌رفته را در ضایعات مواد، توقف خط، کیفیت یا برنامه‌ریزی می‌بینید؟»
- «آیا عیوب به تفکیک محصول، خط و شیفت ثبت می‌شوند؟»
- «تغییرات برنامه تولید بیشتر به علت نوسان سفارش است یا محدودیت ظرفیت؟»
- «چه بخشی از فرایند اجازه نظارت صرفاً پیشنهاددهنده را می‌دهد؟»

**Candidate use cases:** machine-vision inspection (validated false reject/accept rates), predictive maintenance (avoid leakage and spurious causation), production scheduling optimization, generative maintenance manuals assistant, demand sensing, energy analytics.

**KPI:** defect rate, first-pass yield, scrap/unit, unplanned downtime, OEE components, forecast bias, cost/unit, customer complaints.

**Controls:** process safety, product safety, QA release authority, traceability, industrial control/OT separation, backup manual procedure, vendor cybersecurity.

## B. FMCG distribution / sales force / logistics

**Value tree:** cost-to-serve, on-time in-full (OTIF), stockout / fill rate, route utilization, returns, order frequency, salesperson selling time, payment/collection risk.

**Question triggers:**
- «کسری بیشتر در مرکز توزیع رخ می‌دهد یا در نقطه فروش؟»
- «داده سفارش، موجودی و برگشتی به تفکیک مشتری و مسیر ثبت می‌شود؟»
- «نیروی فروش زمان خود را بیشتر صرف سفارش‌گیری می‌کند یا امور اداری؟»
- «محدودیت مسیرها و ناوگان در چه سامانه‌ای ثبت است؟»

**Candidate use cases:** demand forecasting and replenishment, route/vehicle optimization (may be operations research, not always LLM), salesperson copilot, returns anomaly detection, delivery ETA, exception management agent with human-approved commitments.

**KPI:** logistics cost/order, delivery success, OTIF, order-cycle time, stockout rate, returns %, truck fill, selling time.

**Controls:** no autonomous contract signing or credit terms changes; fraud and pricing approval; customer data restrictions; route safety.

## C. Retail chains / supermarket / e-commerce

**Value tree:** on-shelf availability (OSA), inventory turns, waste/spoilage, conversion, gross margin, basket value, lost sales, labor utilization, customer satisfaction.

**Question triggers:**
- «داده فروش صندوق و موجودی انبار شعب چه میزان با هم تطبیق دارند؟»
- «مسئله اصلی کمبود قفسه است یا موجودی مازاد و تاریخ‌مصرف؟»
- «آیا سفارش فروشگاه به تأمین‌کننده خودکار است یا دستی؟»
- «چه بخش از پیشنهادهای شخصی‌سازی با رضایت مشتری سازگار است؟»

**Candidates:** shelf availability prediction, store replenishment, shrink/spoilage forecasting, search and merchandising relevance, workforce shift support, store-manager assistant; agentic returns triage with access limits.

**KPI:** OSA, basket margin, average inventory, shrink, waste %, sales lost, order fill, complaint resolution time, A/B-test incremental gross margin.

**Controls:** customer privacy, promotion fairness, stock data integrity, experimentation guardrails, consent and data retention.

## D. Food and pharmaceutical / regulated manufacturing

**Economic objectives:** batch release quality, compliant traceability, deviations, capacity, wastage, complaint handling, right-first-time, labor productivity.

**Question triggers:** «کدام فرایندهای شما تابع تأیید کیفیت، اعتبارسنجی رسمی یا الزامات تخصصی ایمنی و محصول‌اند؟»

**Candidates:** document retrieval with cited source, deviation triage suggestions, demand planning, read-only process diagnostics, laboratory data quality checks, maintenance knowledge assistants.

**Controls:** never recommend an unvalidated AI agent as final decision maker for medication dosage, batch release, critical process parameters, contamination, safety or regulated compliance; quality/medical/regulatory experts retain decision authority. Confirm relevant local law and standards rather than guess.

**KPI:** deviation closure quality/time, documentation errors, audit findings, scrap, right-first-time; validate any safety-related deployment with qualified personnel.

## E. Packaging, paper and converting

**Value tree:** material waste, cut/print defects, setup/changeover, schedule adherence, energy, returns.

**Probe:** «کدام عیب یا تغییر تنظیمات بیشترین هزینه تکرارشونده را دارد و تصویر/سنسور آن قابل دسترس است؟»

**Candidates:** vision inspection, quality anomaly detection, production planning, maintenance, material yield optimization.

**Controls:** reject-rate and missed-defect tradeoff, calibration, shift/product drift, operator override, industrial safety.

## F. Holding shared services (finance, legal, procurement, HR, IT)

**Value tree:** cycle time, service backlog, manual effort, error/rework, compliance, user satisfaction, spend transparency.

**Probe:** «کدام خدمت میان چند شرکت تکرار می‌شود و داده/اسناد آن از نظر دسترسی قابل‌استفاده مشترک است؟»

**Candidates:** approved document/RAG assistant, procurement contract search, expense exception triage, HR policy Q&A, finance close support, IT helpdesk, knowledge-management agent; human approval for financial/legal/HR action.

**KPI:** resolution time, FTR, documented accuracy, cost per ticket, error/incident rates, user satisfaction.

**Controls:** employees' private data, labor law, access based on legal entity, role separation and conflict of interest, audit logs.

## G. B2B industrial production and equipment

**Value tree:** lead time, machine utilization, yield, engineering change cycle, aftermarket service, spare-parts availability and customer SLA.

**Probe:** «آیا بزرگ‌ترین تنگنا در سفارش‌سازی، برنامه‌ریزی ظرفیت، توقف تجهیزات یا خدمات پس از فروش است؟»

**Candidates:** spare-parts optimization, machine predictive maintenance, service copilot, engineering document assistant, scheduling optimization.

## H. Cross-company supply chain (only when authorized)

**Hypothesis:** demand-to-shelf intelligence can join authorized sales, inventory, order and supply signals from distinct businesses. **Never assume they are linked or can share data.** Ask: «آیا تبادل داده فروش، موجودی و مشتری میان این شرکت‌ها از نظر حقوقی، قراردادی و فنی مجاز و عملی است؟»

**If yes:** pilot with limited SKU/site scope; agree master data, schema, data-use agreement, ROI attribution per legal entity, shared governance.

**If no / unknown:** use aggregated/permissioned data or independently optimized local use cases; put governance discovery before cross-entity integration.

## How to choose sector branches

1. Company sells primarily manufactured goods → A/E/D as needed.
2. Main value chain is moving goods/order taking → B.
3. Owns retail/customer channel → C.
4. Shared group functions → F.
5. Connected portfolio across legal entities → H, after checking legal permission.
6. Multi-business firm → ask which specific operating business or value stream to diagnose first.

Do not overwhelm the user with entire sector checklist. Sector branches are just decision-guiding knowledge to choose the **next single question**.
