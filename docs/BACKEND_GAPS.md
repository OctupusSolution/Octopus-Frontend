# الحاجات اللي الـ Frontend محتاجها ومش موجودة في الـ Backend

ملف حي: **كل ما نخلص ربط شاشة وتظهر حاجة ناقصة، نضيفها هنا فورًا.** لما شباب الـ backend يعملوا حاجة منهم نغيّر حالتها لـ ✅ ونكتب التاريخ.

- **ممنوع** نعدّل في كود الـ backend. الملف ده هو اللي بنبعته لشباب الـ backend.
- الفجوات القديمة الأكبر (CORS، الـ OTP في Development، الـ Public Link) في `octopus-backend/FRONTEND_INTEGRATION_GAPS.md` و`PUBLIC_LINK_MISSING_ENDPOINTS.md`. البنود هنا أحدث، ولو تعارضت الأحدث هي الصح.

**الحالات:** 🔴 ناقص، بيوقفنا | 🟡 ناقص، عملنا حل مؤقت | 🟢 مش مشكلة (اتحلت من جهتنا) | ⏸️ محتاج قرار/تأكيد، مش عيب في الـ backend | ✅ اتعمل في الـ backend

**آخر تحديث:** 2026-09-22 — جولة رابعة: وصّلنا تلاتة كمان من ليستة الـ endpoints الجاهزة والمش مستخدمة: **Public Link** `listVersions`+`restoreSiteVersionToDraft` (1b.11 — سجل إصدارات زي بتاع Floor Plan، زرار جنب Unpublish)، **Staff** `getStaffSettings`/`updateStaffSettings` (مودال صغير: يوم بداية الأسبوع + مدة صلاحية دعوة الموظف)، و**Reservation** `updateReservationSettings`+`getReservationChannels`+`updateReservationChannels` (بند جديد 4.16 — مودال إعدادات؛ لاحظنا إن `UpdateReservationSettingsRequest` هو شكل الإعدادات الكامل مش patch جزئي، فالمودال بيحافظ على كل الحقول اللي مالهاش شاشة زي ما هي بدل ما يفقدها). الجداول الأسبوعية وتواريخ الإغلاق في إعدادات الحجوزات سبناها برة لأنها محتاجة تقويم مش موصوف في أي فريم.

**قبل كده، جولة تالتة:** حل باجين حقيقيين لقيناهم بالصدفة وإحنا بنجرب شاشة المنيو على بيزنس جديد (`hgj`) — راجع 0.10 و2.27 للتفاصيل الكاملة؛ الاتنين اتأكدوا من الـ admin-api logs نفسها مش تخمين. باختصار: توكن منتهي كان بيرجّع 403 `authorization.forbidden` بدل 401 فمكانش بيتجدد تلقائيًا، وبعد ما صلحنا ده لقينا إن `menu.settings.not-initialized` بترجع 409 مش 404 زي ما `ensureMenuSettings` كانت مفترضة، فبيزنس جديد كان بيتقفل عليه المنيو نهائيًا. الاتنين اتصلحوا في الفرونت إند (`http.ts` و`menu-api.ts`) و`npx tsc --noEmit` عدّى نضيف.

**قبل كده، جولة تانية:** راجعنا كل الـ endpoints في `api-client` اللي كانت مكتوبة ومش متنادية من أي شاشة، ووصّلنا اللي كان منطقي نوصله بأمان: `unpublishMenu` (2.24)، `checkOfferSlugAvailability` (2.25)، `getReservationDaySummary` (4.14)، `getReservationContactLink` (4.15)، `listWaitingEntryActivity` (5.5 اتحدّث)، `listFloorPlanVersions`+`restoreVersionToDraft` (3.8)، `getStaffAvailability` (6.5 اتحدّث)، `listStaffMemberActivity` (6.21). كل التمن دول 🟢 مش عيب backend — نفس نمط تحديث امبارح. سبنا حاجات فيها خطورة أعلى من غير قرار أو تصميم جاهز (تفاصيلها في نفس الصفوف): `assignReservationResource` (4.7b — يحتاج ربط حقيقي بين اختيار الطاولة في شاشة التعديل والـ floor plan)، `getStaffPermissionCatalog` (6.13 — قرار تصميم زي ما هو موضّح)، `listFonts` (1b.7 — يحتاج تحميل خطوط فعلي مش مجرد نداء API)، `acquireFloorPlanEditLock`/`releaseFloorPlanEditLock` (3.9 — يحتاج شاشة قفل تعاوني جديدة). كمان لاحظنا إن `listAccessCodes`/`createAccessCode`/`regenerateAccessCode`/`revokeAccessCode` كانت متربطة بالفعل (`access-codes-modal.tsx`) من غير ما تتسجل هنا. **تصحيح بعد مراجعة تانية بالـ grep الفعلي على الكود:** رفع الصور بتاع المنيو والموقع (`requestMediaUpload`/`completeMediaUpload`/`getMediaAsset` و`requestSiteMediaUpload`/`completeSiteMediaUpload`/`getSiteMediaAsset`) كان متربط بالفعل من زمان في `shared/api/media.ts` — مكنش ناقص. وكذلك التعديل الجماعي للسعر والنص (`previewPriceAdjustment`/`executePriceAdjustment`/`previewTextReplacement`/`executeTextReplacement`) كان متربط في `bulk-price-modal.tsx`/`bulk-text-modal.tsx` — الناقص الوحيد فعليًا من الجروب ده هو `listBulkOperations` (2.26). (قبل كده: نفس اليوم، وصّلنا `confirmedOn`/`confirmedMethod` (4.4b)، `dueBy`/`paidOn`/`method`/`txnId` للعربون (4.5b)، وزرار/شاشة "تسجيل دفعة" في Orders (6b.18). قبل كده: 2026-09-21، بعد ملاحظات مصطفى ضياء على المراجعة الأولى — راجع قسم **مراجعة مصطفى ضياء (2026-09-20)** تحت)

---

## مراجعة مصطفى ضياء (2026-09-20)

بعت الملف الأول وردّ إن فيه بنود برة السكوب وبنود غلط. عدّلنا على أساس ملاحظاته:

1. **Reservation — حالتا Arrived/Seated (كان بند 4.1):** مش عيب. `InService` قرار مقصود عشان الـ modules تبقى generic وتنفع بيزنسات تانية بعدين. اتشالت من الطلبات وهنعدّل الواجهة تستخدم `InService` بس.
2. **Floor Plan — smoking area (بند 3.3):** مصطفى شايفها برة السكوب على حد علمه، وطلب من **آلاء خميس** تتأكد. حطيناها ⏸️ لحد ما ترد.
3. **الرسايل والمكالمات (بنود 4.2، 4.3، 5.2، 5.7):** محتاجة integration مع خدمة رسايل خارجية (3rd party) لسه مش متوفرة، والـ WhatsApp موديول كامل لوحده. مش هنطلبها كبنود urgent دلوقتي، حطيناها ⏸️ لحد ما الموديول يتعمل.
4. **بنود كانت واصلة غلط إنها "ناقصة من الـ backend" وهي في الحقيقة شغل عندنا في الفرونت** (الـ endpoint موجود بالفعل وإحنا لسه ما وصلناهوش): الخطوط في Public Link (1b.7)، الـ versions/rollback (1b.11)، الجدران والديكور في Floor Plan (3.5)، سجل الـ activity في قائمة الانتظار (5.5). اتغيرت لـ 🟢 وبقى واضح إنها علينا.
5. **بنود هي في الحقيقة قرار منتج مش عيب backend:** الصفحات المتعددة والـ SEO في Public Link (1b.2، 1b.3)، قسم Offers/Events (1b.4)، وهل الحجز ممكن من غير تفضيل طاولة (4.8). اتحطت ⏸️ لحد ما ناخد قرار قبل ما نرجعلهم بطلب فني.

باقي البنود اتراجعت وهي فعلًا داخل السكوب ومشاكل حقيقية محتاجة شغل من الـ backend.

---

## 0. مشترك بين كل الـ modules

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 0.1 | endpoint للفروع (Branches) | 🔴 | كل الـ modules (Menu، Staff، Reservation، FloorPlan، WaitingList) بترجع `branchId` كـ GUID ومفيش طريقة نجيب اسم الفرع. شاشة `settings/branches` كلها mock. محتاجين list/CRUD للفروع. |
| 0.2 | رفع الصور: `complete` بيفشل `menu.media.verification-failed` (bug في الـ backend مع Cloudinary) | 🟡 (شغّالين بـ shim محلي، لسه محتاج إصلاح حقيقي) | جربنا بحساب Cloudinary شخصي (Dynamic folder mode ✅). الـ ticket بيتمضي والرفع لـ Cloudinary بينجح (200)، لكن الأصل بيتحفظ باسم `octopus/<tenant>/<business>/menu/item-image/<id>` لأن الـ `folder` الموقّع بيتضاف كـ prefix للـ public_id. وبعدين `complete` بيسأل Admin API عن `resources/image/upload/<id>` بالـ id **من غير الفولدر** فبيرجع 404. الحل عند الـ backend: يتحقق بالـ public_id الكامل (folder/publicId)، أو يوقّع `asset_folder` بدل `folder`. كمان: `resourceType` بيرجع `Image` وCloudinary عايز `image` lowercase في الـ URL (بنعالجها عندنا). **الحل المؤقت عندنا:** shim محلي (loopback) بيعيد توقيع الرفع بـ `asset_folder` وبيضيف `folder` لرد الـ Admin API. لما شباب الـ backend يصلحوها: نمسح `VITE_MEDIA_UPLOAD_SHIM` من `.env.local` ونرجّع `AdminApiBaseAddress` الافتراضي. |
| 0.3 | الـ Worker شغال بس بـ `DOTNET_ENVIRONMENT=Testing` | 🟡 | في Development بيقع بـ DI error، وفي Production بيرفض الـ fake gateway. شغّالين بـ Testing للـ worker بس. |
| 0.4 | الـ compose والـ config ناقصين للـ modules الجديدة | 🟡 | ضفنا محليًا: Billing/Businesses/Onboarding secret refs، وOnboarding:Checkout، وTenancy:Provisioning، واستيراد الـ catalog. محتاجين ده يبقى جاهز في الـ repo. |
| 0.5 | الـ sample catalog مفيهوش menu / floor-plan / reservation / waiting-list | 🟡 | ضفنا الـ `menu` module في الـ catalog المحلي بإيدينا. |
| 0.6 | `migrate.sh` ناقص chains | 🟡 | شغّلنا الـ 13 chain بإيدينا على PostgreSQL محلي. |
| 0.7 | الـ contracts في الـ docs/الـ DTOs مش متطابقة مع اللي بيرجع فعلًا | 🟢 | صححناها في `api-client`: السعر `amount` مش `amountMinor`، وadvisories `labelCodes`، وplacement `id`، وmedia `assetId/kind`. نلفت نظر شباب الـ backend عشان الـ docs. |
| 0.8 | مفيش push/realtime (SignalR) | 🟡 | اللوحة الحية بتعمل polling كل 15 ثانية. |
| 0.9 | الـ unauthenticated بيرجع 403 مش 401 في FloorPlan وReservation | 🟢 | بنتعامل معاه. للعلم بس. |
| 0.10 | توكن منتهي (expired) بيرجع 403 `authorization.forbidden` مش 401 — على الأقل في Menu (`GET /menu/settings`) | 🟢 مش على الـ backend (اتحل 2026-09-22) | نفس فكرة 0.9 بس لسبب مختلف: أكدناها من الـ admin-api logs نفسها — JwtBearer بيسجل `IDX10223: Lifetime validation failed` (التوكن منتهي)، وبدل ما الـ pipeline يرجّع 401 عادي، الـ request بيكمل كـ "مش متعرّف عليه" لحد ما الـ authorization check جوه الـ handler (`GetCatalogSettingsQuery`) يرجّعه `authorization.forbidden`/403. المشكلة إن الفرونت إند (`http.ts`) كان بيعمل refresh للتوكن بس لما يشوف 401، فمع الـ 403 دي التوكن مكانش بيتجدد أبدًا والمستخدم كان مضطر يعمل logout/login يدوي. **الحل عندنا:** `apiRequest` دلوقتي بيعتبر 403 + `errorCode === "authorization.forbidden"` زي الـ 401 بالظبط ويحاول refresh قبل ما يفشل. لو الباك إند اتصلح بحيث JWT منتهي يرجّع 401 حقيقي (زي أي endpoint تاني)، الكود الإضافي ده هيبقى زيادة مش ضرر. |

---

## 1. Identity / Setup

لا توجد فجوات مفتوحة حاليًا (الـ wizard والـ login والـ business-session شغالين end-to-end). للـ OTP و CORS شوف الملف القديم.

---

## 1b. Public Link (متوصل على الـ API الجديد: slug، البراند، الأقسام، النشر)

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 1b.1 | الـ site مش بيتعمل تلقائي مع البيزنس | 🟡 | `GET /public-link` بيرجع 404 `site.not-found` لحد ما يتحجز slug (`PUT /slug` هو اللي بيعمل الـ site). الواجهة بتتعامل مع ده. |
| 1b.2 | الصفحات (pages) والـ navigation | ⏸️ | ده قرار منتج قبل ما يبقى طلب backend: الموقع صفحة واحدة ولا متعدد الصفحات؟ لو هيتعمل متعدد صفحات، وقتها نحدد شكل الـ endpoints المطلوبة. |
| 1b.3 | الـ SEO (title / description / social image) والدومين المخصص | ⏸️ | محتاج نتأكد الأول إن ده داخل سكوب النسخة الحالية من Public Link قبل ما نطلبه كحقول في الـ backend. |
| 1b.4 | أقسام Offers / Events | ⏸️ | محتاج نتأكد إن قسم Offers/Events على صفحة الموقع فعلًا مطلوب في السكوب الحالي قبل ما نطلب section type جديد. |
| 1b.5 | إعدادات أقسام Menu/Reservations/Waitlist (display style، CTA...) | 🟡 | الأقسام المرتبطة بمصدر بتاخد `sourceSettings` بس ما وصّلناهاش. الأقسام المبنية (hero) بنحمّل الإعدادات كلها في `content`. |
| 1b.6 | Waitlist كمصدر محتوى | 🔴 | `content-sources` فيه menu وreservation بس. |
| 1b.7 | الخطوط | 🟢 مش على الـ backend | كتالوج الـ API موجود (`GET /fonts`: inter، cairo، tajawal، poppins، playfair-display). حاليًا بنحوّل اختيارات الواجهة القديمة (inter، readex، georgia، tahoma) تقريبيًا؛ ده شغل عندنا في الفرونت (نقرأ من `GET /fonts` بدل القائمة الثابتة)، مش مطلوب من الـ backend. |
| 1b.8 | الألوان: 4 ألوان في الواجهة مقابل tokens كتير | 🟡 | بنكتب primary → `core.primary`، light → `background.surface`، accent → `core.accent`، dark → `text.heading`. باقي الـ tokens (أزرار، نصوص...) مالهاش شاشة. |
| 1b.9 | قراءة الموقع العام (`GET /v1/public-site`) | 🟡 | بتعتمد على الـ Host (`slug.<suffix>`)، فمش شغالة على localhost. محتاجين نعرف نختبرها محليًا (host header أو dev override). |
| 1b.10 | الـ hero image داخل إعدادات الـ hero (imageDataUrl) | 🟡 | بنشيل الـ data URLs من `content`. صورة الـ hero الفعلية بتتربط عن طريق `brand.heroBackground` بس. |
| 1b.11 | الـ versions والـ rollback | 🟢 مش على الـ backend (اتحل 2026-09-22) | ضفنا زرار "Version History" وشاشة في `publish-step.tsx` (جنب Unpublish)، بيسترجع نسخة قديمة كمسودة جديدة (`restoreSiteVersionToDraft`) مش نشر مباشر — نفس منطق Floor Plan (3.8). `rollbackSiteToVersion` (نشر مباشر) سبناه من غير ربط لنفس السبب. |

---

## 1c. الـ Customer storefront (apps/customer): الـ tenant والمنيو المنشور متوصلين

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 1c.1 | المنيو المنشور محتاج access code | 🔴 | المنيو العام بيتفتح بـ `GET /v1/public/menu-codes/{key}` بس، والـ public-site مبيرجعش الـ key ولا محتوى المنيو المربوط. الموقع نفسه (مش الـ QR) محتاج طريقة يعرف بيها المنيو. حاليًا بنقرأ الـ key من `DEV_MENU_ACCESS_KEY`. |
| 1c.2 | الفروع | 🔴 | مفيش endpoint عام للفروع، فالـ storefront بيعرض البيزنس كفرع واحد مفتوح. أوقات العمل والعنوان وحالة "مفتوح" كلها ناقصة. |
| 1c.3 | مناطق التوصيل والحد الأدنى للطلب | 🔴 | مفيش. |
| 1c.4 | الطلبات (السلة والدفع والتتبع) | 🔴 | فيه دلوقتي موديول Order (شوف 6b)، بس ده للكاشير/الويتر بس ومفيهوش مسار للعميل يطلب بنفسه — ده قرار لسه ما اتاخدش حسب توثيق الموديول نفسه. الـ storefront بيكمل mock لحد ما ياخد. |
| 1c.5 | الحجز من الـ storefront | 🔴 | فيه `GET /reservation/availability` عام بس، ومفيش endpoint عام لإنشاء الحجز أو قائمة الانتظار. |
| 1c.6 | معرّف الصنف في المنيو العام | 🟡 | الأصناف جاية بمفتاح مؤقت (`i1`) مش id ثابت، فالسلة (المحفوظة بالـ id) هتتأثر لو المنيو اتغير. محتاجين id ثابت لكل صنف. |
| 1c.7 | صور الأصناف/الأقسام في الرد العام | 🟡 | لسه ما اتجربتش مع صور حقيقية. بنتعامل مع string أو object فيه url. |
| 1c.8 | الـ public-site على localhost | 🟢 | بيعتمد على الـ Host، فبنجرب بـ `<slug>.localhost:3000` والـ Next server بيبعت `Host: <slug>.octopus.app`. |
| 1c.9 | ثيم البراند في الـ storefront | 🟡 | اتطبق: اللون الأساسي (`core.primary`)، لون العناوين والخلفية، الخطوط (inter، cairo، tajawal، poppins، playfair)، نص الـ hero، اللوجو، وصورة الـ hero. باقي الـ tokens (أزرار، حدود، footer...) لسه ما اتربطتش. |
| 1c.10 | الـ Node `fetch` بيتجاهل الـ Host header | 🟢 | اتحلت عندنا: الـ storefront بيستخدم `node:http` لقراءة الـ PublicApi (عشان الـ tenant بيتحدد من الـ Host). |

---

## 2. Menu (المكتبة والأقسام والأصناف والـ modifiers والـ Theme والـ Publish متوصلين)

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 2.1 | `GET` لقسم واحد (Section) | 🟡 | الـ list بترجع ملخص بس (من غير description/color/placements). عملنا حيلة: `POST /placements` بقائمة فاضية بترجّع القسم كامل. ممكن تتغير من غير إنذار. |
| 2.2 | Restore لقسم متأرشف | 🔴 | فيه archive بس. الاسترجاع محلي وبيضيع بعد reload. |
| 2.3 | إنشاء قسم Offers تلقائيًا | 🟢 (اتحدّث 2026-09-22) | مش بيتعمل تلقائي وله entitlement — للعلم بس. باقي كلام البند القديم ("قسم Offers عندنا محلي حاليًا") بقى غير صحيح: العروض مربوطة بالكامل بالـ API الحقيقي (`offers-sync.ts`: إنشاء/تعديل/حذف/تفعيل، الصور، الجدولة، القنوات) — لقيناها لقيّة في جلسة سابقة، متعملة بس مش متسجّلة هنا ولا في git. |
| 2.4 | Presets للثيم (theme presets / fonts) | 🔴 | فاضية في الـ config. شاشة الـ Theme محتاجاها. |
| 2.5 | Presets للجدول (schedule presets) وأكواد الـ facts | 🔴 | فاضية. شاشة الجدول والتغذية محتاجاها. |
| 2.6 | الـ labels/tags الجاهزة (seeded labels) | 🔴 | الواجهة عندها 4 tags جاهزة (chef recommended، top selling...) ومفيش مقابل seeded. |
| 2.7 | `subLabel` للـ modifier option | 🟡 | مفيش حقل. بيتحفظ محليًا وبيضيع بعد reload. |
| 2.8 | الـ help text لمجموعة الـ modifiers مطلوب | 🟢 | الـ backend بيرفض الفاضي (422). بنبعت الاسم بدله لو فاضي. |
| 2.9 | التغذية (nutrition) والحساسيات (allergies) للصنف | 🟡 | فيه `facts` و`advisories` بس الأشكال مختلفة وأكواد الـ facts فاضية. لسه ما وصّلناهم. |
| 2.10 | قنوات الصنف (dine-in/takeaway/delivery) | 🟡 | فيه `fulfillmentModes` بأكواد مجهولة. لسه ما وصّلناها. |
| 2.11 | ألوان/لوجو/hero الثيم | 🟡 | الواجهة بتحتفظ بيهم في الـ site draft (مشترك مع Public Link) مش على المنيو، فما بنبعتوش للـ API (بنسيب قيم الـ API زي ما هي). لازم قرار: الثيم على المنيو ولا على الـ Public Link. |
| 2.12 | الـ theme presets (الستة) | 🟡 | الـ backend `theme-presets` فاضي، فبنبعت `presetCode` كما هو من السيرفر (null). الاختيار محلي. |
| 2.13 | النشر لقنوات منفصلة (POS / Public Link / Table QR) | 🟡 | `publish` بينشر المنيو كله. الواجهة بتعرض 3 قنوات بنفس الحالة. مفيش نشر لكل قناة. |
| 2.14 | الـ publish محتاج صنف واحد Active على الأقل في قسم | 🟢 | رسالة `menu.review.menu.no-publishable-section`. الواجهة بتعرضها كما هي. |
| 2.16 | `GET /menu/offers` بيرجع 500 لما مفيش أي عرض | 🔴 | `ArgumentOutOfRangeException: pageSize ('0') must be >= 1` في `PagedResult` من `ListOffersQueryHandler` (لما الـ list فاضية). لسه بيرجع 200 بعد أول عرض. bug في الـ backend، ما بنستخدمش الـ list عندنا. |
| 2.17 | الـ slug بتاع العرض | 🟢 | بيقبل حروف صغيرة وشرطات بس (`menu.offer.slug-invalid`). الواجهة كانت بتسمح بـ underscore وحروف كبيرة، فبنحوّلها. وتكرار الاسم بيرجع 409. |
| 2.18 | قنوات العرض (6 مفاتيح في الواجهة مقابل 3 + 3 أكواد) | 🟡 | الـ fulfillment: on-site/collection/delivery ← dineIn/takeaway/delivery. الـ sales channels: pos/public-link/qr ← kiosk/onlineOrdering/mobileApp (تخمين). محتاجين تأكيد المقابلة. |
| 2.19 | تشغيل العرض (`/active`) بيتم رفضه لو العرض ناقص (السعر 0 مثلًا) | 🟢 | 422. الواجهة بتفضله inactive على السيرفر من غير ما تفشل الحفظ. |
| 2.20 | حقول العرض اللي مالهاش مقابل: `customerCanChange`، وسعر كل صنف جوه العرض، والـ VAT | 🟡 | محلية وبتضيع بعد reload. |
| 2.21 | جدول المنيو (Schedule) مفيهوش المنطقة الزمنية ولا الفروع اللي بيتطبق عليها | 🟡 | بيتحفظوا محلي بس. |
| 2.22 | قنوات البيع في الواجهة (POS / Public Link / Table QR) اتربطت بأكواد `pos` / `public-link` / `qr` بتخمين | 🟡 | محتاجين تأكيد الأكواد الصح. |
| 2.23 | قراءة الجدول والقنوات محتاجة طلبين زيادة لكل منيو عند فتح الشاشة | 🟡 | لو فيه endpoint بيرجعهم مع القائمة يبقى أحسن. |
| 2.15 | مراجعة الـ validation في الواجهة (محلية) غير الـ backend | 🟡 | الاتنين بيتفحصوا: المحلي أولًا ثم `validation-report` والنشر. ممكن يختلفوا (أمثلة: صور الأصناف warning عند السيرفر). |
| 2.24 | مفيش زرار "إلغاء النشر" للمنيو في الواجهة | 🟢 مش على الـ backend (اتحل 2026-09-22) | الـ endpoint (`unpublishMenu`) كان جاهز ومحدش بيناديه. ضفنا زرار "Unpublish" في القايمة المنسدلة لكل منيو في `menu/library` (يظهر بس للمنيو اللي اتنشر قبل كده ومش أرشيف)، مع تأكيد قبل ما يتنفذ. |
| 2.25 | مفيش فحص فوري لتوفر الـ slug بتاع العرض وقت الكتابة | 🟢 مش على الـ backend (اتحل 2026-09-22) | `checkOfferSlugAvailability` كان جاهز ومحدش بيناديه. ضفنا فحص live (debounced) في تاب Info بتاع محرر العروض، بيظهر "متاح/مستخدم" تحت حقل الـ slug بنفس تحويل lowercase-dash اللي بيتبعت فعليًا للسيرفر — بيقلل مفاجأة الـ 409 وقت الحفظ (مرتبط بـ 2.17). |
| 2.26 | مفيش سجل/تاريخ للعمليات الجماعية (تعديل سعر/نص) اللي اتعملت قبل كده | 🔴 | `listBulkOperations` لسه مش متربط. للتوضيح: باقي الجروب ده (`previewPriceAdjustment`/`executePriceAdjustment` في `bulk-price-modal.tsx`، و`previewTextReplacement`/`executeTextReplacement` في `bulk-text-modal.tsx`) **متربط بالفعل** من زمان — راجعنا الكود اتأكدنا، مكنش محتاج شغل. |
| 2.27 | بيزنس جديد (منيو settings لسه معملهاش init) بيقفل الصفحة كلها بـ "authorization.forbidden" | 🟢 مش على الـ backend (اتحل 2026-09-22) | مكانش عيب صلاحيات فعلي (راجع 0.10 كمان). لما `GET /menu/settings` يترفض لأنه لسه مش initialized، الرد الحقيقي `menu.settings.not-initialized` بحالة **409 Conflict**، مش **404** زي ما `ensureMenuSettings` (`entities/menu/menu-api.ts`) كان مفترض. يعني أي بيزنس جديد كان بيقع على الخطأ الأول (0.10) وبعد إصلاحه كان هيقع هنا: `ensureMenuSettings` بترمي الخطأ تاني بدل ما تعمل init لأنها بتفحص 404 بس. صححناها تفحص الاتنين (404 أو الكود `menu.settings.not-initialized`). |

---

## 3. Floor Plan

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 3.1 | اسم الضيف والنادل وملاحظة الطاولة على اللوحة الحية | 🔴 | `LiveSpotResponse` فيه partySize وexternalReferences وreasonCode بس. الواجهة بتعرض guestName وserver وnote. بتظهر فاضية. |
| 3.2 | إخفاء طاولة من اللوحة الحية (`visible`) | 🟡 | مربوطة بـ `acceptance.customerVisible`، ومعناها مختلف (ده للعميل مش للـ host). |
| 3.3 | سياسة التدخين / المنطقة (area) / حجم الطاولة | ⏸️ | مصطفى قال موضوع الـ smoking area برة السكوب على حد علمه، وطلب من **آلاء خميس** تتأكد. مستنيين ردها قبل ما نكمل فيها. لحد دلوقتي بنستخدم attributes (`smoking`، `indoor`، `vip`، `size-*`) اللي ضفناها في الـ catalog. |
| 3.4 | أشكال طاولات إضافية (square، tabliya، majlis-l، tent) | 🟡 | بنضيفها للـ catalog تلقائيًا أول مرة (`PUT /settings/catalogs/shapes`). الأفضل تبقى seeded. |
| 3.5 | الجدران والأبواب والديكور والمناطق المرسومة والخلفية | 🟢 مش على الـ backend | فيه `scene` endpoints جاهزة، إحنا لسه ما وصّلناهاش في الشاشة. شغل فرونت مش طلب من الـ backend. |
| 3.6 | الحجوزات على الطاولات | 🔴 | مفيش حجوزات في الـ module. بتيجي من Reservation. |
| 3.7 | `gridStep` بيتقرّب لرقمين عشريين | 🟢 | 0.375 بتبقى 0.38. بنحوّل الإحداثيات بثابت 0.375 عندنا. |
| 3.8 | مفيش سجل إصدارات (Version History) للمخطط في الواجهة | 🟢 مش على الـ backend (اتحل 2026-09-22) | `listFloorPlanVersions`/`restoreVersionToDraft` كانوا جاهزين ومحدش بيناديهم. ضفنا زرار "Version History" وشاشة في `floor-plan-hub.tsx` (تظهر لما فيه published)، بيسترجع نسخة قديمة كمسودة جديدة (مش نشر مباشر) عشان التاجر يراجعها في المحرر الأول — نفس منطق Public Link مع نسخه (1b.11). |
| 3.9 | قفل تعاوني (Edit Lock) لمنع اتنين يعدلوا نفس المخطط بنفس الوقت | 🔴 | `acquireFloorPlanEditLock`/`releaseFloorPlanEditLock` جاهزين بس لسه ما اتربطوش. محتاجة شاشة/حالة جديدة (قفل، مين ماسكه، Force takeover) في نقطتين دخول المحرر (`builder/scratch`، `builder/quick`) — شغل أكبر من مجرد نداء API، سبناه لحد قرار بتصميم الحالة دي. |

---

## 4. Reservation (القائمة والإنشاء والحالات والإلغاء متوصلين)

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 4.1 | حالتا `Arrived` و`Seated` | ✅ مش عيب | قرار تصميم مقصود من مصطفى: `InService` عامة أكتر وهتنفع البيزنسات الجديدة (الـ modules بتتعمل generic من الأول). الواجهة هتتظبط تستخدم `InService` بدل الاتنين. |
| 4.2 | إرسال رابط الدفع فعليًا | ⏸️ | `deposit/link` بيولّد الرابط بس مبيبعتوش. مصطفى أكد إن الإرسال محتاج integration مع خدمة رسائل خارجية لسه مش متوفرة، فمش مشكلة نطلبها دلوقتي. هنسيبها لحد ما موديول الرسايل يبقى جاهز. |
| 4.3 | إشعار الضيف عند تغيير الحجز (`notifyGuestOnChange`) | ⏸️ | نفس سبب 4.2: محتاج موديول رسايل (WhatsApp/SMS) لسه مش موجود. مش urgent دلوقتي. |
| 4.4a | حساسية الضيف (allergyTags) | 🔴 | مفيش حقل. |
| 4.4b | `confirmedOn`/`confirmedMethod` | 🟢 مش على الـ backend (اتحل 2026-09-22) | مفيش حقل مباشر اسمه كده، لكن قابل للاشتقاق: `confirmedMethod` من `autoConfirmApplied`، و`confirmedOn` من `createdAtUtc` (تقريب كويس لأغلب الحالات) ثم بيتصحح للتاريخ الحقيقي من سجل النشاط (`GET /{id}/activity`, action `"Confirmed"`) لما تفاصيل الحجز تتفتح. اتربط في `reservations-api.ts` (`confirmedOf` + `refreshConfirmedDetails`). |
| 4.5a | نوع العربون (Per Guest / Full Prepayment) لكل حجز | 🔴 | مفيش حقل نوع على مستوى الحجز نفسه، بس موجود على مستوى إعدادات البيزنس (`depositKind`). |
| 4.5b | `dueBy`، `paidOn`، `method`، `txnId` للعربون | 🟢 مش على الـ backend (اتحل 2026-09-22) | كل الحقول دي موجودة فعلًا، بس مش في `ReservationResponse.deposit` (اللي فيه الشروط بس): `dueBy` = `paymentDueAtUtc` على مستوى الحجز نفسه (كنا مش بنقرأه)، و`paidOn`/`method`/`txnId` جايين من `GET /{id}/deposit` (الـ attempts) اللي محدش كان بينادي عليه. اتربطوا في `reservations-api.ts` (`withDepositDetail` + `refreshDepositDetails`, وتحديث `depositOf` عشان `dueBy`). |
| 4.6 | `cancelledAt` و`cancelReason` في الـ DTO | 🟡 | موجودين في الـ command وسجل النشاط بس مش واضح في الرد. |
| 4.7 | الـ area على الحجز | 🟡 | بتيجي من حاويات FloorPlan. |
| 4.8 | الحجز لازم يتحدد له طاولة أو مجموعة (`resourceId` أو `groupId`) | ⏸️ | `POST /reservations` بيرفض من غير واحد منهم (422). ده سلوك الـ backend الحالي، مش عيب بالضرورة — محتاجين قرار منتج: هل لازم يبقى فيه حجز "من غير تفضيل طاولة"؟ لو الإجابة لأ، الواجهة صح زي ما هي دلوقتي. |
| 4.9 | الـ timezone الافتراضي للبيزنس `UTC` | 🔴 | `settings.timeZoneId = "UTC"` لبيزنس سعودي، فالأوقات بتظهر UTC. محتاج يتظبط من الـ onboarding (Asia/Riyadh). |
| 4.10 | الـ list مبترجعش الـ deposit ولا الملاحظات | 🟡 | `ReservationSummaryResponse` من غير deposit/labels/notes، فبنعمل `GET /{id}` لكل حجز (N+1). محتاجين يضيفوها للـ summary أو batch. |
| 4.11 | مفيش sort في الـ list ولا branchId | 🟡 | بنرتب ونفلتر عندنا في المتصفح. |
| 4.12 | `statuses` filter بيطابق الحالة المخزنة مش الفعلية | 🟢 | للعلم: الحجز المنتهي بيظهر Expired بس فلتر Pending بيلقطه. |
| 4.13 | الـ "Arrived" في القائمة مش مدعومة | ✅ مش عيب | نتيجة قرار 4.1: هنشيل زرار/حالة "Arrived" من الواجهة ونستخدم `InService` (Seated) بس. |
| 4.14 | كروت الـ KPI في أعلى شاشة الحجوزات بتتحسب من الصفوف المحمّلة بس | 🟢 مش على الـ backend (اتحل 2026-09-22) | `getReservationDaySummary` كان جاهز ومحدش بيناديه، فالعدّاد كان بيعتمد على أي صفوف حصل تحميلها (مشكلة لو فيه صفحات زيادة، مرتبط بـ 4.10/4.11). دلوقتي بنستخدم عدد اليوم الحقيقي من السيرفر لما مفيش فلتر حالة/منطقة/مصدر/بحث مطبّق، ونرجع للحساب المحلي لو فيه فلتر بيضيّق العرض. |
| 4.15 | "إرسال تذكير" و"تنبيه الضيف" بيفتحوا wa.me مبني يدويًا في الواجهة | 🟢 مش على الـ backend (اتحل 2026-09-22) | `getReservationContactLink` كان جاهز ومحدش بيناديه. دلوقتي الزرارين (في قائمة الصف وفي شاشة تفاصيل الحجز) بيطلبوا الرابط والرسالة الجاهزة من السيرفر (قالب البيزنس نفسه)، ولو الطلب فشل بيرجعوا للرابط المحلي القديم. |
| 4.7b | تغيير طاولة حجز موجود من شاشة التعديل مبيوصلش للسيرفر أصلًا | 🟢 مش على الـ backend (اتحل 2026-09-22) | فحصنا الكود: `updateRow` (`reservations-api.ts`) كان بيبعت الملاحظات/الوسوم/عدد الضيوف بس، لأن `UpdateReservationRequest` مفهوش `resourceId` أصلًا — التغيير محتاج `assignReservationResource` (كان جاهز ومحدش بيناديه). المشكلة الحقيقية كانت إن قايمة الطاولات في ديالوج التعديل (`reservation-form-modal.tsx`) بتيجي من `floorTables` المحلي (mock)، مش من مخطط الفلور الحقيقي. صلحناها: الديالوج بقى بيجيب طاولاته من `useFloorPlan().published.doc.tables` الحقيقي (نفس مصدر شاشة "حجز جديد")، وبيبني خريطة رقم الطاولة → `resourceId` حقيقي. وقت الحفظ، لو الطاولة اتغيرت فعلًا وعندنا `resourceId` حقيقي ليها، بننادي `assignReservationResource`. لو مفيش plan منشور أو الطاولة مش موجودة فيه، مفيش نداء بيتبعت (بدل ما نبعت حاجة غلط). |

---

| 4.16 | مفيش شاشة إعدادات لموديول الحجوزات أصلًا (حدود الحجز، العربون، القنوات) | 🟢 مش على الـ backend (اتحل 2026-09-22) | `updateReservationSettings`/`getReservationChannels`/`updateReservationChannels` كانوا جاهزين ومفيش شاشة. ضفنا مودال إعدادات (زرار جنب Print) بيغطي: أقصى مدة حجز مسبق، أقل إشعار مسبق، المدة الافتراضية، الفاصل بين الحجوزات، دقة المواعيد، أقصى/أقل عدد ضيوف، العربون (تفعيل/نوع/قيمة)، وقنوات الحجز (تفعيل/إلغاء). **مهم:** `UpdateReservationSettingsRequest` هو شكل الإعدادات الكامل (`Omit<ReservationSettingsResponse, "overriddenFields">`) مش patch جزئي ومفيهوش `expectedVersion` — المودال بيحافظ على الكائن الكامل زي ما جاله ويلمس بس الحقول الظاهرة، عشان الحقول اللي مالهاش شاشة (refund bands، message templates، الجداول الأسبوعية، تواريخ الإغلاق، الـ timezone) متتمسحش بالغلط. الجداول الأسبوعية وتواريخ الإغلاق سبناهم برة الشاشة لأنهم محتاجين تقويم مش موصوف في أي فريم. |

## 5. Waiting List (القائمة والإضافة والإشعار والجلوس متوصلين)

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 5.1 | حالة `onTheWay` | 🔴 | مالها مقابل. الواجهة عندها 5 حالات والـ backend 6 مختلفين. |
| 5.2 | قناة الإشعار (whatsapp/call/sms) | ⏸️ | مصطفى وضّح إن الـ WhatsApp موديول كامل لوحده والرسايل عمومًا محتاجة 3rd-party integration لسه مش جاهزة. هنسيب الحقل ده لحد ما الموديول ده يتعمل، مش هنطلبه كبند مستقل. |
| 5.3 | الاسم أول/أخير | 🟡 | الـ backend اسم واحد. بندمجهم. |
| 5.4 | الحذف (remove) محتاج PIN مدير | 🟡 | ضفنا خانة PIN في تأكيد الحذف والـ approver = حساب المستخدم الحالي. ما اتجربش: مفيش طريقة نعرف بيها نضبط PIN للمستخدم (الـ backend بيرجع `PinNotSet`). محتاجين endpoint/شاشة لضبط الـ PIN في Identity أو Staff. |
| 5.5 | الـ activity (التاريخ) لكل صف | 🟢 مش على الـ backend (اتوصل 2026-09-22) | `listWaitingEntryActivity` كان جاهز ومحدش بيناديه، فـ`entry.history` المحلي كان دايمًا فاضي لأي صف حقيقي. دلوقتي شاشة "History" لكل ضيف بتجيب السجل الحقيقي من السيرفر لما يكون الصف حقيقي (id بشكل UUID)، وبتعرض اسم الحدث (`action`) والوقت والـ actor كما هما — أسماء الأحداث من السيرفر مش موثقة فعرضناها زي ما هي بدل ما نحاول نطابقها على الأيقونات الخمسة المحلية القديمة (اللي كانت اتسمت على أساس بيانات الفكستشر مش السيرفر). |
| 5.6 | تفضيل المنطقة/الطاولة في الإضافة | 🟡 | الـ backend بياخد `groupId`/`resourceId` (GUID) والواجهة نص حر، فما بنبعتوش. |
| 5.7 | `call` (مكالمة) كحالة | ⏸️ | نفس موضوع الرسايل: المكالمات محتاجة 3rd-party (تليفونيا) لسه مش متاحة. الزرار حاليًا بيفتح تطبيق الاتصال بس من غير تسجيل حالة، وده كافي دلوقتي. |
| 5.8 | الـ start-service محتاج `containerId` مع `resourceId` | 🟢 | بنجيبه من الـ floor plan id. للعلم بس. |
| 5.9 | الـ list مبترجعش الملاحظة ولا الـ resource | 🟡 | بنعمل `GET` لكل صف (N+1). |
| 5.10 | الـ entitlement: module `waiting-list` مش بيتمنح للبيزنس الموجود | 🔴 | بعد إضافة الـ module للـ catalog، البيزنس القديم بيرجع 403. اضطرينا نضيف صفوف `TenantModuleEntitlements` و`TenantFeatureEntitlements` (`waiting-list:core`) يدويًا محليًا. محتاجين الـ provisioning/الـ catalog يمنحه. |

---

## 6. Staff (الموظفين والأدوار والشيفتات والجدول والإجازات متوصلين. الصلاحيات لسه)

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 6.1 | iqamaExpiry، وbands الراتب، وجهة اتصال الطوارئ، والمستندات | 🔴 | مفيش حقول. |
| 6.2 | الحضور والانصراف وحالة الشيفت الحية (On Shift / Absent) | 🔴 | مفيش موديول حضور. |
| 6.3 | الاسم بالعربي (`nameAr`) | 🔴 | اسم أول وأخير بس. |
| 6.4 | صورة الموظف | 🔴 | مفيش حقل. الـ mock بيستخدم `staff-photos.ts`. |
| 6.5 | تعديل توفر الموظف (availability) | 🔴 | `GET /availability` قراءة بس، مفيش تعديل. بس دلوقتي بنستخدم القراءة نفسها (كانت جاهزة ومحدش بيناديها — اتوصل 2026-09-22): شاشة Availability بتجيب حالة/شيفت اليوم الحقيقي من `getStaffAvailability` وترجع للحساب المحلي (الـ mock) بس لو مفيش رد من السيرفر لموظف معيّن. لسه محتاجين endpoint للتعديل نفسه. |
| 6.6 | "Shift roles" | 🔴 | مفيش مقابل. |
| 6.7 | إلغاء طلب إجازة | 🔴 | مفيش endpoint. |
| 6.8 | نوع عقد "seasonal" | 🟡 | الـ `EmploymentType` فيه `Temporary`، فبنعتبره seasonal. |
| 6.9 | إنشاء موظف بيطلب `branchId` ومفيش أي endpoint نجيب منه فرع | 🔴 | `POST /staff/members` بيرفض من غير `branchId` (422). مفيش فروع في أي مكان (ولا في `GET /businesses/{id}`). الـ backend بيقبل أي GUID، فبنبعت `businessId` نفسه كفرع افتراضي مؤقت. لازم endpoint للفروع (شوف 0.1). |
| 6.10 | الـ Staff مش بيتعمله seed للبيزنس | 🔴 | `Staff:Seeding` (job titles وroles وshift definitions من config) مش متظبط محليًا، فالأدوار ومسميات الوظائف والشيفتات فاضية. ولازم نضيف كل حاجة بإيدينا. محتاجين `Staff:Seeding:Profiles` في الـ compose. |
| 6.11 | الـ Position في فورم إضافة موظف (Waiter/Cashier...) | 🟡 | قائمة ثابتة عندنا، والـ backend عنده `jobTitleId` (كتالوج لكل بيزنس فاضي) و`roleId`. مش بنبعتها. |
| 6.12 | الجنسية واللغات: الواجهة نص حر والـ backend كود ISO من حرفين | 🟡 | بنحوّل لأسماء معروفة (السعودية، مصر...) وأي اسم مش معروف بيتشال. |
| 6.13 | مصفوفة الصلاحيات (module × feature × action) مقابل `permission-catalog` | 🔴 | الـ backend بيتعامل بأكواد مسطحة زي `floor-plan.plans.manage`، والواجهة مصفوفة view/create/edit/delete/approve/export/setting. محتاجة قرار تصميم + mapping. حاليًا محلية وبتضيع. الـ endpoint (`getStaffPermissionCatalog`) جاهز فعلًا من ناحية الـ backend — الناقص قرار الـ mapping مش نداء API. |
| 6.14 | تكرار رقم الجوال بيرجع 409 | 🟢 | الواجهة بتظهره في بانر. للعلم. |
| 6.16 | أيام الإجازة المخططة (offDays) في الجدول | 🟡 | الـ assignment ليها shift بس، فمفيش "يوم راحة" محفوظ. بتفضل محلية وبتضيع بعد reload. |
| 6.17 | شيفت بأوقات مخصصة من غير shift role (`custom`) | 🟡 | الـ API بيحتاج `shiftDefinitionId` دايمًا، فبنستخدم أول shift role فعّال مع override للأوقات. |
| 6.18 | مدى الجدول في الـ API أقصاه 62 يوم | 🟢 | بنحمّل من -14 إلى +40 يوم. التنقل خارج المدى ده محتاج fetch إضافي (لسه ما عملناه). |
| 6.19 | أنواع الإجازة بتتعمل عند أول طلب | 🟡 | `time-off/types` فاضي (مفيش seed)، فبننشئ النوع باسمه (Annual، Sick...) أول ما نحتاجه. |
| 6.20 | `breakMinutes` للشيفت | 🟡 | الواجهة مفيهاش وقت راحة، فبنبعت 0. |
| 6.15 | الـ Owner مش بيظهر كموظف | 🟡 | صاحب البيزنس مش عضو staff تلقائيًا. الواجهة القديمة كانت بتعرضه. |
| 6.21 | كارت "Activity & Audit" في بروفايل الموظف بيعرض بيانات محلية (mock) بس | 🟢 مش على الـ backend (اتحل 2026-09-22) | `listStaffMemberActivity` كان جاهز ومحدش بيناديه. دلوقتي الكارت بيجيب السجل الحقيقي لموظف حقيقي (id بشكل UUID) ويعرضه (اسم الحدث كما هو من السيرفر + الوقت + الـ actor)، وبيرجع للـ mock بس لو مفيش رد أو الموظف لسه محلي. |
| 6.22 | مفيش شاشة إعدادات لموديول الموظفين نفسه (يوم بداية الأسبوع، صلاحية دعوة الموظف) | 🟢 مش على الـ backend (اتحل 2026-09-22) | `getStaffSettings`/`updateStaffSettings` كانوا جاهزين ومفيش شاشة. ضفنا مودال صغير ("Schedule Settings") من زرار ترس جنب Bulk Assign في تاب Shifts → Schedule، بيغطي الحقلين بس. |

---

## 6b. Order (US-018) — لسه على برانش مش متدمج في `dev`

موديول جديد كامل بناه مصطفى (`mustafadiaa-order-management-us018`، 42 كوميت، لسه ملحقش يتدمج). حسب توثيقه هو **للكاشير/الويتر بس** — مفيش فيه مسار للعميل يطلب بنفسه (QR/كيوسك/الموقع)، ده قرار لسه ما اتاخدش. ربطناه محليًا يوم 2026-09-21: عملنا checkout للبرانش، شغلنا الـ migration بتاعته على الـ Postgres المحلي، ضفناه للـ catalog المحلي ومنحنا entitlement يدوي لتينانتات التجربة (زي ما عملنا مع Waiting List). صفحة "Orders" في الواجهة بقت بتقرا الطلبات الحقيقية دي وتعرضها فوق الصفوف التجريبية (قراءة بس لسه — الأزرار Void/Refund/Wastage/Cancel لسه بتشتغل على البيانات التجريبية).

| # | الحاجة | الحالة | التفاصيل |
|---|---|---|---|
| 6b.1 | إنشاء الطلب بدون `fulfilmentCode` بيرجع 500 بدل 422 | 🔴 | `TakeOrderCommandValidator` عنده `.NotEmpty().Must(regex)` على نفس الحقل من غير `.When`، فلو الحقل فاضي بيرمي `ArgumentNullException` جوه الـ regex بدل ما يرجع رسالة validation عادية. |
| 6b.2 | `POST /payments/tenders` محتاج `Idempotency-Key` مش موثق في توثيق الموديول | 🟢 | جربناها لايف ورجعت `idempotency.http.key.missing`. ضفناها في الـ client عندنا. |
| 6b.3 | `POST /payments/links` على الـ route اللي في التوثيق بيرجع 404 | 🔴 | الـ route الحقيقي مش زي المكتوب (يمكن يبقى تحت `/{orderId}/payments/links`). لسه ما اتأكدناش من الشكل الصح. |
| 6b.4 | استرجاع (`refund`) يدوي من غير `paymentId` بيرجع 422 | 🟢 | التوثيق بيقول `paymentId` اختياري، بس عمليًا لازم يتبعت لنوع `Manual`. حدّثنا الـ contract عندنا. |
| 6b.5 | شكل الردود (`OrderResponse`, `OrderTotalsResponse`, الجدول اليومي `summary`) مختلف عن وصف التوثيق | 🟢 | صححناها في `order-admin.ts` بعد تجربة حقيقية (take order → get order). باقي الـ endpoints (settings، catalog، list، payments، refunds) لسه شكلها من التوثيق بس، محتاجة تتأكد قبل ما نربط عليها شاشة. |
| 6b.6 | حالات الطلب في الموديول (`New/Accepted/.../Voided`) مقابل الـ 6 مراحل في شاشة Orders الحالية | 🟡 | مفيش "Accepted" كـ pill منفصل في الشاشة، و"Voided" مالهاش مرحلة واضحة في الـ timeline. عملنا تقريب محلي في `order-record-bridge.ts`، محتاج مراجعة تصميم. |
| 6b.7 | الموديول لسه "مش متأكد ضد قاعدة بيانات حقيقية" حسب كلام مصطفى نفسه | 🟡 | التوثيق بيقول اختبارات الـ Docker/PostgreSQL integration لسه ما اتشغلتش. جربناها على Postgres محلي وشغالة للقراءة والإنشاء والقبول، بس متوقعين مفاجآت لحد ما تتدمج وتتأكد بشكل رسمي. |
| 6b.8 | ربطنا فعليًا Cancel/Void/Wastage بالـ API الحقيقي (بموافقة PIN حقيقية)، وجربناها لايف في المتصفح ونجحت | ✅ اتربط | التفاصيل في 6b.9–6b.12. Refund لسه مش مربوط (محتاج `paymentId` من `GET /{id}/payments`، مفيش شاشة لسه تجيبه). |
| 6b.9 | حقل السبب اسمه `reasonCode` (+`note` منفصل) مش `reason`، والرد رجّع `ReversalOutcomeResponse` (`{order, refunds}`) مش `OrderResponse` مباشرة | 🟢 | بعت `reason` وحده بيرجع 422 "This action needs a reason" لأن الحقل الحقيقي مختلف. صححنا `order-admin.ts` (Cancel/Void/Wastage التلاتة) بعد تجربة حقيقية. |
| 6b.10 | كل حالة (`reasonCode`) لازم تكون من قايمة معتمدة على مستوى البيزنس نفسه (`GET /orders/settings`)، مش أي نص | 🔴 | جربنا "wrongOrder" ورجع 422 "not a reason this business has configured". القوايم الفعلية: cancel = `customer-request/duplicate/unavailable/mistake/other`، void = `customer-refused/wrong-item/quality/mistake/other`، wastage = `spoiled/dropped/overproduction/preparation-error/expired/other`. أسباب الواجهة القديمة (`wrongOrder`, `testOrder`...) متطابقتش، فعملنا تحويل تقريبي محليًا (`toCancelReasonCode` وأخواتها في `order-api.ts`) لحد ما ناخد قرار: يا إما نغيّر خيارات الواجهة تطابق قوايم الباك إند، يا إما الباك إند يقبل أي نص. |
| 6b.11 | إعداد approval PIN (`PUT /accounts/approval-pin`) كان بيرجع 500 "key has not been materialised" | 🟡 (اتصلح محليًا) | محتاج `Identity:ApprovalPin:KeySecretRef` مش متظبط في الـ compose. ضفناه محليًا (نفس نمط مفاتيح الـ OTP). لازم يتضاف للـ repo. |
| 6b.12 | `RecordWastageRequest.cost` رقم عادي (`decimal`) مش `MoneyDto`، و`WastageResponse` (قايمة `GET /wastage`) شكلها مختلف تمامًا عن أول تخمين لينا | 🟢 | صححناها في `order-admin.ts` من كود الباك إند نفسه (`RefundDtos.cs`)، لسه ما جربناهاش لايف (المسار المستخدم فعليًا هو الـ POST بس). |
| 6b.13 | شكل `RefundResponse` الحقيقي مختلف تمامًا عن أول تخمين (`state`/`trigger` نصوص، `gratuityAmount` منفصل، `paymentId` مش nullable) | 🟢 | صححناها من كود الباك إند (`RefundDtos.cs`)، وبعدين جربناها لايف (تحصيل نقدي فعلي واسترجاع جزئي فعلي) واتأكدنا إنها صح. |
| 6b.14 | ربطنا فعليًا تحصيل الدفع نقدًا (`recordTender`) والاسترجاع (`Refund`) بالـ API الحقيقي، وجربناهم لايف في المتصفح ونجحوا | ✅ اتربط | عملنا طلب حقيقي، حصّلنا قيمته نقدًا، واسترجعنا جزء منه من نفس شاشة Orders — رجعت "Cash Refund Recorded!" وتحدثت الأرقام فوق فعليًا. |
| 6b.15 | مسارات الدفع/الاسترجاع الحقيقية مختلفة تمامًا عن التوثيق: كلها تحت مسار الطلب نفسه، مش مسار عام | 🔴 | `POST /payments/tenders` و`/payments/links` على مستوى orders (زي ما التوثيق قال) بترجع 404. الصح: `POST /{orderId}/payments/tenders`، `/{orderId}/payments/links`، و`/{orderId}/refunds/{refundId}/retry` (مش `/refunds/{id}/retry` عام). صححناها كلها من كود الباك إند نفسه. |
| 6b.16 | `GET /{id}/payments` و`GET /{id}/refunds` بيرجعوا Array عادي، مش `ListEnvelope` زي باقي القوايم في الموديول | 🟢 | صححناها في `order-admin.ts`. |
| 6b.17 | تسمية `kind` غير متسقة بين الطلب والرد في الدفع | 🟢 | الطلب `kind` بيتبعت بحروف صغيرة-مفصولة (`"cash"`, `"card-present"`)، والرد بيرجعه PascalCase (`"Cash"`, `"CardPresent"`, `"OnlineLink"`). للعلم بس، اتعاملنا معاه في الكود. |
| 6b.18 | مفيش شاشة لتحصيل الدفع من الواجهة أصلاً | 🟢 مش على الـ backend (اتحل 2026-09-22) | مكانش عيب backend — الـ API (`recordCashTender`) كان مربوط بالفعل من غير زرار يستدعيه. ضفنا زرار "تسجيل دفعة" جديد (خامس بجانب Void/Refund/Wastage/Cancel) وشاشة بسيطة (مبلغ + تأكيد) مبنية على نفس مكونات الصفحة المشتركة (`FieldLabel`, `PrimaryButton`, `ResultModal`) بما إن مفيش تصميم جاهز لها. الملف: `record-payment-flow.tsx`. |

---

## 7. مفيش module في الـ backend أصلًا (الواجهة تفضل mock)

الـ POS والـ KDS (الطلبات نفسها بقى ليها موديول، شوف 6b أعلاه، بس لسه على برانش منفصل ومحتاج الحاسم في مسار العميل نفسه)، والعملاء/CRM (planning بس)، والدفعات والفواتير والـ ZATCA والمحاسبة، والمخزون، والتسويق والولاء، والتقارير، والـ Dashboard، وHR الباقي، والـ customer storefront (الطلب والدفع من عند العميل نفسه — موديول Order الجديد نص بيقول ده قرار لسه ما اتاخدش).

---

## طريقة التحديث

1. لما تظهر حاجة ناقصة وإحنا بنوصّل: نضيف صف جديد في قسم الـ module، برقم تالي وحالة وتفاصيل.
2. لما نعمل حل مؤقت: الحالة 🟡 ونكتب الحل.
3. لما شباب الـ backend يعملواها: نغيّر لـ ✅ ونكتب التاريخ.
4. لما نبعت الملف لشباب الـ backend: نكتب تاريخ الإرسال هنا:
   - لسه ما اتبعتش.
