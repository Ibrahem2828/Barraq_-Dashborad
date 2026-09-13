# تقرير تدقيق جاهزية Production — Baraq Dashboard

> **تحديث (2026-09-09):** تم إصلاح Critical offline، وتقوية Middleware للتحقق من الجلسة،
> وإضافة حراسة RBAC على مستوى الصفحة عبر `RouteAccessGate`.
>
> التقييم الأصلي أدناه يوثّق حالة ما قبل الإصلاح. أعد التدقيق بعد اكتمال بقية نقاط High.

**النطاق:** تدقيق فقط (بدون تعديل على الكود وقت إعداد التقرير).  
**تاريخ التدقيق:** 8 سبتمبر 2026

## الأوامر المنفّذة

| الأمر | النتيجة |
|--------|---------|
| `npm run typecheck` | نجح (`exit 0`) — بدون أخطاء |
| `npm run lint` | نجح (`exit 0`) — تحذيران فقط |
| `npm run build` | نجح (`exit 0`) — Next.js 15.5.21 |
| `test` | غير موجود في `package.json` |

---

## نتائج الفحوصات الآلية

### TypeScript
لا أخطاء. الأنواع سليمة لهذا الإصدار.

### ESLint
تحذيران فقط في `components/data/useResource.ts:33`:
- `react-hooks/exhaustive-deps` (اعتماد ناقص على `query`)
- تعبير معقّد في dependency array: `JSON.stringify(query)`

### Production Build
نجح. المسارات ديناميكية `ƒ`، First Load JS المشترك ~103KB، middleware ~34KB. تحذيرات ESLint نفسها ظهرت أثناء البناء ولم تمنعه.

### Tests
لا يوجد script أو ملفات اختبار — فجوة تغطية تشغيلية.

---

## المشاكل المؤكدة

### Critical

| # | الملف | المشكلة | أثر Production |
|---|--------|---------|----------------|
| 1 | `lib/api/binding.ts:23-33` + `app/api/bff/[...path]/route.ts:17-22` | عند إيقاف الربط: stubs تُرجع `is_superuser: true` **قبل** أي فحص Auth/CSRF | وصول لوحة بصلاحيات كاملة بدون مصادقة حقيقية |
| 2 | `app/api/auth/login/route.ts:23-30` | Offline login يصدر cookies بدون التحقق من البريد/كلمة المرور | أي `POST /api/auth/login` يفتح الجلسة |
| 3 | `Dockerfile:7-12` + `docker-compose.yml:7-15` + `binding.ts:14-20` | Docker لا يمرّر `NEXT_PUBLIC_API_BINDING_ENABLED` وقت البناء؛ الافتراضي `false`؛ العميل يفضّل العلم العام | نشر Docker قد يعمل بصمت في وضع offline/superuser رغم ضبط السيرفر لاحقاً |

### High

| # | الملف | المشكلة | أثر Production |
|---|--------|---------|----------------|
| 4 | `middleware.ts:25-30` | الحماية بوجود cookie فقط، بدون تحقق من صلاحية التوكن | أي قيمة cookie تتجاوز redirect للـ login (الـ API الحي ما زال يحمي البيانات) |
| 5 | `AdminProvider` + صفحات `(dashboard)` | RBAC على الـ Sidebar فقط؛ الصفحات تُرسم دائماً | الاعتماد الكلي على الباك؛ في offline كل الصفحات مكشوفة |
| 6 | `lib/api/binding.ts:17-20` | `NEXT_PUBLIC_*` يتجاوز علم السيرفر | سوء إعداد سهل → وضع offline مميّز في الإنتاج |
| 7 | أغلب الصفحات تقريباً `"use client"` + CSR | لا prefetch RSC للبيانات | TTI أبطأ، حِمل JS أعلى، تجربة فارغة حتى اكتمال الـ API |

### Medium

| # | الملف | المشكلة | أثر Production |
|---|--------|---------|----------------|
| 8 | `app/api/bff/[...path]/route.ts:14-57` | بروكسي مفتوح لأي مسار تحت الباك بعد CSRF+Bearer | سطح هجوم أوسع من حاجة اللوحة |
| 9 | login / password-reset routes | لا `validateMutationCsrf` (عكس logout/BFF) | احتمال CSRF على login/reset (SameSite=Lax يخفف جزئياً) |
| 10 | `AdminProvider.tsx:31-36` | `unreachable` يُعامل كجلسة مقبولة | استمرار UI أثناء انقطاع الباك |
| 11 | `ThemeProvider.tsx:15-22` | قراءة `document` في initializer للـ state | تحذيرات Hydration؛ أيقونة الثيم قد تختلف SSR/CSR |
| 12 | غياب `app/global-error.tsx` | `app/error.tsx` لا يغطي أخطاء root layout | فشل layout → شاشة خطأ افتراضية ضعيفة |
| 13 | لا `loading.tsx` تحت `[locale]`/(dashboard) | لا حدود Suspense على مستوى المسار | تنقّل بدون skeleton إطاري |
| 14 | `AUTH_COOKIE_SECURE` قابل لـ `false` | `.env.local` حالياً `false` (محلي) | خطر إن نُسخ لإنتاج HTTP — اعتراض cookies |
| 15 | لا CSP في `next.config.ts` | headers أخرى موجودة بدون Content-Security-Policy | دفاع أضعف ضد XSS مستقبلي/طرف ثالث |

### Low

| # | الملف | المشكلة | أثر Production |
|---|--------|---------|----------------|
| 16 | `useResource.ts:33` | تحذير hooks + `JSON.stringify(query)` | إعادة جلب زائدة أو سلوك غير متوقع |
| 17 | `Sidebar` أثناء `loading` | كل عناصر التنقل ظاهرة | كشف بنية الأدمن لحظياً |
| 18 | `app/layout.tsx` `lang="ar"` ثابت | EN يعتمد على wrapper داخلي | تأثير a11y/SEO طفيف |
| 19 | `MetricCard` يفرض `ar-SY` | أرقام غير متسقة في EN | تجربة i18n ضعيفة |
| 20 | `eslint-config-next@15.4.6` vs `next@15.5.21` | عدم تطابق إصدار | قواعد lint قد لا تطابق runtime |
| 21 | لا اختبارات آلية | لا regression safety | مخاطر صامتة عند التغيير |

**ملاحظة Runtime محلية:** طرفية `npm run dev` أظهرت سابقاً `Can't resolve 'axios'`، بينما `axios@1.19.0` موجود في `node_modules` والـ **production build نجح**. غالباً حالة cache/dev قديمة وليست فشل اعتماد في البناء.

---

## 1) التقييم الإجمالي: **67 / 100**

| البعد | تقدير |
|--------|--------|
| جودة البناء/الأنواع/اللينت | قوي (حوالي 90) |
| أمن الجلسة عند Live Binding صحيح | جيد |
| أمان وضع offline / Docker env | ضعيف جداً |
| هيكل Next (RSC/حدود أخطاء/Performance) | متوسط |
| اختبارات وعمليات إطلاق | ضعيف |

النسخة **قابلة للبناء** ومهندسة جيداً كنمط BFF، لكنها **ليست آمنة للإطلاق** دون ضمان ربط حي مضبوط end-to-end وإغلاق مسار offline المميّز.

---

## 2) ما يمنع الإطلاق إلى Production

1. **نشر Docker/compose بدون ضمان `NEXT_PUBLIC_API_BINDING_ENABLED=true` وقت البناء** → خطر وضع offline بصلاحيات superuser.
2. **منطق offline الحالي** (login بدون credentials + stubs مميّزة + BFF بدون auth) — غير مقبول في أي بيئة إنتاج حتى كـ fallback.
3. **ضرورة ضبط إنتاج صارم:** `API_BINDING_ENABLED=true`، `AUTH_COOKIE_SECURE=true`، HTTPS، وعدم نسخ `.env.local`.
4. **غياب اختبارات E2E للـ Auth/BFF** — لا بوابة جودة تشغيلية قبل الإطلاق (مانع عملياتي إن كان الإطلاق يتطلب ضماناً).

مع Live Binding مضبوط بالكامل، البيانات محمية عبر الباك؛ لكن نقاط 1–2 تبقى **موانع إطلاق**.

---

## 3) أهم 5 مشاكل

1. **Critical:** Offline stubs + BFF بدون مصادقة تمنح `is_superuser`.
2. **Critical:** Offline login يصدر جلسة بدون تحقق.
3. **Critical:** مسار Docker لا يضمّن علم الربط في بناء العميل → وضع offline صامت.
4. **High:** Middleware يفحص وجود cookie فقط.
5. **High:** لا حراسة RBAC على مستوى الصفحة؛ الاعتماد على Sidebar + الباك فقط.

---

## 4) الأشياء الجيدة حالياً

- نمط **BFF** واضح؛ التوكنات في **HttpOnly cookies**؛ CSRF double-submit + مطابقة Origin على طفرات BFF/logout.
- `BACKEND_API_URL` server-only؛ لا تسريب عبر `NEXT_PUBLIC_*`.
- رؤوس أمنية أساسية: `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`؛ `poweredByHeader: false`.
- `output: "standalone"` + healthcheck مناسب للحاويات.
- توحيد **axios** للمتصفح والسيرفر؛ معالجة أخطاء/envelope منظمة.
- تغطية واسعة لعقد الـ Admin API؛ i18n AR/EN؛ حماية redirect بعد login داخل نفس الـ locale.
- `typecheck` + `lint` + `build` ناجحة على هذه النسخة.
- تخفيف FOUC للثيم عبر boot script + `suppressHydrationWarning`.

---

## 5) ما يستحق فحصاً أعمق لاحقاً

1. **مسار Docker build-args / runtime env** لـ `NEXT_PUBLIC_API_BINDING_*` وتفعيل الربط الحي.
2. **E2E:** Login → session/verify → قائمة → طفرة → logout → refresh/401.
3. **حراسة صلاحيات** على مستوى المسار/الخادم (وليس Sidebar فقط).
4. **Allowlist لمسارات BFF** بدل البروكسي المفتوح.
5. **CSP + rate limiting** على login/password-reset.
6. تقليل `"use client"` ونقل prefetch لـ overview/`admin/me` إلى Server Components.
7. `global-error.tsx` + `error`/`loading` تحت `[locale]`/(dashboard).
8. إصلاح Hydration في `ThemeProvider` و`useSearchParams` خلف Suspense.

---

## الخلاصة

البناء والأنواع جاهزان تقنياً، لكن **الجاهزية الأمنية/التشغيلية للإطلاق غير مكتملة** بسبب وضع offline المميّز ومسار Docker للربط. لا يُنصح بالإطلاق قبل إغلاق هذه النقاط.
