# مشاكل Backend من اختبار الـ Frontend

تاريخ: 2026-09-23 · البيئة: docker-compose المحلي (AdminApi :8081، PublicApi :8082)

كل بند فيه: المشكلة، إزاي تتكرر، الدليل، والمطلوب.

**آخر مراجعة: 2026-09-27** على آخر commit في الـ backend (`0fc1996`، branch `integration/order-us018-into-public-link-us019`؛ `dev` ماتغيّرش من 24/9). كل البنود لسه موجودة ماعدا **4** (اتحلّت) و **16** (اتحلّت في الـ integration branch بس، ولسه مش في `dev`). البند 14 هو نفسه 28.

---

## 1. رفع الصور (Menu و Public Link) لسه بيفشل من غير الـ shim المحلي 🔴

**الأثر:** مفيش أي صورة بتتحفظ: لوجو، favicon، خلفية الـ hero، صور الأصناف. الـ frontend دلوقتي بيكمّل حفظ باقي البيانات، لكن الصورة نفسها مش بتتحفظ.

**السبب (من BACKEND_GAPS 0.2، ولسه موجود):**
- الـ upload ticket بيتمضي بـ `folder`، فـ Cloudinary بيحفظ الأصل باسم `folder/publicId`.
- `POST .../media-uploads/{uploadId}/complete` بيسأل الـ Admin API عن `resources/image/upload/<publicId>` **من غير الفولدر**، فبيرجع 404، والنتيجة `menu.media.verification-failed`.

**الحل المؤقت كان shim محلي، ومش شغال دلوقتي:**
- الـ frontend: `VITE_MEDIA_UPLOAD_SHIM=http://127.0.0.1:8444`، والمنفذ مش listening.
- الـ backend: `Integrations__Cloudinary__AdminApiBaseAddress=https://host.docker.internal:8443/v1_1/`، ودي نفس الـ shim.
- فولدر الـ shim `octopus-local/cloudinary-shim` مفيهوش غير `certs` فاضي، يعني الكود بتاعه مش موجود.

**الدليل:** في logs الـ AdminApi يوم 2026-09-23 بين 20:52 و 20:55 UTC، فيه 13 طلب `POST /public-link/media-uploads` رجعوا 200، ومفيش ولا طلب `/complete`.

**المطلوب:**
- التحقق في `complete` يستخدم الـ public_id الكامل (`folder/publicId`)، أو التوقيع يبقى بـ `asset_folder` بدل `folder`.
- `resourceType` يرجع lowercase (`image`) عشان يمشي مع URL بتاع Cloudinary.
- `AdminApiBaseAddress` يرجع للقيمة الافتراضية (`https://api.cloudinary.com/v1_1/`).

---

## 2. مفيش طريقة في بيئة الـ dev نعرف بيها كود تأكيد الإيميل (OTP) 🔴

**الأثر:** أي اختبار آلي للتسجيل، أو اختبار بإيميلات وهمية، بيقف عند شاشة الكود.

**إزاي تتكرر:** سجّل بـ `anything@octopus.dev`. الـ worker بيبعت الكود بإيميل حقيقي عن طريق Brevo، والرد 201، والكود مش موجود في أي log. في الـ DB متخزّن hash بس.

**المطلوب:** provider وهمي للـ Development (مثلاً `Identity:Email:Provider=Log`) يكتب الكود في الـ log، أو endpoint للـ dev بس يرجّع آخر كود لإيميل معيّن.

---

## 3. التسجيل وإعادة الإرسال بيرجّعوا نجاح من غير ما يبعتوا إيميل، والـ UI مش عارف 🟡

**ده سلوك متعمّد عشان محدش يعرف مين عنده حساب (enumeration safety)، بس بيلخبط المستخدمين والتيم:**
- `POST /v1/accounts/register` بإيميل متسجّل قبل كده بيرجّع 200 ومفيش إيميل.
- `POST /v1/accounts/resend-verification-code` بيرجّع 202 ومفيش إيميل في الحالات دي:
  - في أول 30 ثانية من آخر كود (cooldown).
  - لما يعدّي حد عدد الأكواد (issuance limit).
  - لو الإيميل متأكد قبل كده.
  - لو الإيميل مش موجود.

**الدليل:** register الساعة 20:09 (200) و resend الساعة 20:15 (202) يوم 2026-09-23، ومفيش أي نداء لـ Brevo بعدهم. بعدها register بإيميل جديد الساعة 20:19 اتبعت فوراً (Brevo 201).

**المطلوب:**
- لو الإيميل متسجّل ومش متأكد، يتبعتله كود جديد، أو إيميل "عندك حساب بالفعل" (FR-030 بيسمح بكده).
- الـ resend يرجّع للـ UI وقت الـ cooldown المتبقّي، بدل ما يسكت.

---

## 4. الـ worker مكانش بيوصل لـ RabbitMQ بعد الـ restart ✅ اتحلّت

**الدليل:** من 20:11:17 لحد 20:12:04 UTC كان فيه `BrokerUnreachableException: Connection failed, host 172.20.0.3:5672` كل 5 ثواني، وبعدها اتصل.

**المطلوب:** الـ worker يستنى الـ RabbitMQ يبقى healthy قبل ما يبدأ (`depends_on: condition: service_healthy` في الـ compose). **27/9: موجود دلوقتي في الـ compose.**

---

## 5. الـ worker بيحاول يقرا catalog file مش موجود كل 5 دقايق 🟢

`FileNotFoundException: Could not find file '/catalog/catalog.local.json'`. الملف محتاج يتعمله mount في الـ compose، أو الـ `Onboarding:Catalog` يتضبط على `samples/catalog.development.json`.

---

## 6. Redis حالته Degraded في `/health` على الـ AdminApi والـ PublicApi 🟢

`{"name":"redis","status":"Degraded"}`، مع إن `octopus-backend-redis-1` حالته healthy. محتاج نتأكد إن connection string بتاع Redis بيشاور على الـ container الصح. كمان فيه containers تانية من Aspire شغالة في نفس الوقت (`redis-bpxyqsyf` وغيرها).

---

# الجولة التانية: اختبار كل الـ modules في المتصفح (2026-09-24)

الحساب المستخدم في الاختبار عنده بيزنس "Octupus" (وجبات سريعة). الوقت في الـ logs بتوقيت UTC.

## 7. تعارض الـ version بيرجّع 500 بدل 409 🔴

**إزاي تتكرر:** طلبين `PUT /menu/menus/{id}/builder-progress` لنفس المنيو في نفس اللحظة. الـ frontend اتصلّح عشان مايبعتش الطلب مرتين، لكن الـ backend لازم يتعامل مع الحالة دي صح.

**الدليل:** correlationId `0de6771deb844f50852f27026e32da6d`، والخطأ `DbUpdateConcurrencyException` من غير ما يتعالَج، فبيرجع `unexpected.error` 500.

**27/9: لسه موجودة:** 12 طلب `builder-progress` متوازيين، 7 منهم رجعوا 500 `unexpected.error`.

**المطلوب:** أي `DbUpdateConcurrencyException` يترجم لـ 409 `concurrency.stale`. ده في كل الـ modules، مش Menu بس.

## 8. الـ token المنتهي بيرجّع 403 بدل 401 على endpoints البيزنس 🔴

**الأثر:** بعد 15 دقيقة من غير نشاط، كل طلبات الصفحة بترجع 403 `authorization.forbidden` برسالة زي "does not hold the required permission 'staff.roles.read'". الـ frontend مضطر يعتبر الـ 403 ده كأنه token منتهي ويجدّد مرتين. ولو المستخدم فعلاً مالوش صلاحية، الـ frontend مش هيقدر يفرّق بين الحالتين.

**الدليل:** الساعة 21:26:15 و 21:43:18 UTC: `/v1/businesses` رجع 401، وفي نفس اللحظة `/orders` و `/staff/roles` رجعوا 403.

**27/9: لسه موجودة، واتضح إنها أوسع:** طلب من غير token خالص، أو token متلاعب في توقيعه، أو token منتهي، كلهم بيرجّعوا 403 `authorization.forbidden` على `/staff/roles`.

**المطلوب:** لما الـ JWT يفشل في التحقق (`IDX10223 Lifetime validation failed`)، الرد يبقى 401 على كل الـ endpoints، ومايوصلش لفحص الصلاحيات.

## 9. تفعيل دخول الموظف بيرجع 500: إعداد ناقص 🔴

**إزاي تتكرر:** `POST /staff/members/{id}/login/enable`.

**الدليل:** correlationId `845b3e16c62c42f4a59e213fff3c58e0`، والخطأ: `InvalidOperationException: The Staff invitation transport key was not materialized at host startup. Configure Staff:InvitationTransport:KeySecretRef`.

**المطلوب:** إضافة `Staff__InvitationTransport__KeySecretRef` والـ secret بتاعه في `docker-compose` (زي مفاتيح الـ OTP). من غيره مفيش أي دعوة موظف هتشتغل. (الـ frontend اتصلّح كمان عشان مايحاولش يفعّل الدخول لموظف ماعندوش إيميل.)

## 10. مفيش حجز من غير طاولة، يعني مفيش حجوزات من غير مخطط قاعة 🟡 (قرار منتج)

`CreateReservation` بيشترط `ResourceId` أو `GroupId` (`Must(ResourceId.HasValue != GroupId.HasValue)`). يعني أي مطعم مانشرش مخطط قاعة مش هيقدر ياخد ولا حجز، حتى الحجوزات "قيد الانتظار".

**المطلوب:** قرار: يا إما نسمح بحجز من غير طاولة، يا إما نعمل مجموعة افتراضية "أي طاولة" تتعمل تلقائي مع البيزنس.

## 11. رسالة `menu.settings.not-initialized` مضلّلة 🟡

`CreateCatalogItem` بيرجّع `menu.settings.not-initialized` لما الإعدادات **موجودة** بس العملة فيها `null` (`ApplyPrice`). ده صعّب معرفة السبب. (الـ frontend اتصلّح وبقى يحط SAR والمنطقة الزمنية.)

**المطلوب:** خطأ مخصوص زي `menu.settings.currency-missing`. أو الأفضل إن الإعدادات تتعمل تلقائي مع البيزنس بعملته ومنطقته الزمنية، زي ما `Tenancy:Provisioning:Defaults` بيعمل.

## 12. تقرير التحقق في المنيو بيرجّع أكواد بس 🟢

`GET /menu/menus/{id}/validation-report` بيرجّع `code` من غير أي رسالة. الـ frontend بقى يترجم الأكواد اللي بتمنع النشر، لكن أي كود جديد هيظهر خام. **المطلوب:** حقل `message` (عربي/إنجليزي)، أو كتالوج رسمي للأكواد.

## 13. مفيش API للفروع 🟡 (BACKEND_GAPS)

المنيو والموظفين والإعدادات بيعرضوا فروع تجريبية (Jeddah - Corniche، Riyadh - Olaya...) لأن مفيش endpoint يرجّع فروع البيزنس. البيزنس المختبَر عنده فرع واحد بس.

## 14. الأدوار والوظائف مابتتعملش للبيزنس الجديد 🟢 (BACKEND_GAPS 6.10) — نفس البند 28

تبويب الأدوار فاضي لبيزنس جديد. محتاجين `Staff:Seeding:Profiles` في الـ compose.
## 15. `docker/migrate.sh` مابيشغّلش chain المحتوى بتاع الـ Public Link 🔴 (branch us019)

**إزاي تتكرر:** بدّل لـ `mustafadiaa-public-link-website-us019`، وشغّل `docker compose run --rm migrate`، وبعدين `GET /v1/public-site`.

**الدليل:** الـ migrate طبّق `PublicLink_PreviewLinks` بس، والـ PublicApi رجع 500 بالخطأ `42703: column p.manifest does not exist`. الـ migration `20260924013640_PublicLinkContent_MultiPageExpand` تبع `PublicLinkContentDbContext` (tenant plane)، والـ chain ده مش موجود في `migrate.sh`. طبّقته يدوي بـ `dotnet ef database update --context PublicLinkContentDbContext`، ورجع 200.

**المطلوب:** إضافة `PublicLinkContentDbContext`، وأي module له tenant chain خاص (FloorPlan و Staff و Reservation و WaitingList و Order...)، لـ `migrate.sh`. أو تطبيق الـ tenant chains تلقائي للـ tenants الموجودين عند التحديث.

## 16. الـ Public Link CMS (us019) مش مدموج مع الـ Orders (us018) 🟡 اتحلّت في `integration/order-us018-into-public-link-us019`، ولسه مش في `dev`

الـ branch الاتنين متفرّعين: us019 مافيهوش module الـ Orders، ودمجهم محلياً عمل conflicts في حوالي 30 ملف (`Program.cs` و `AdminApiModules.cs` و `WorkerModules.cs` و `Migrations` والـ tests والـ docs). طول ما البيئة المحلية على us019، شاشات الطلبات والـ KDS بترجع 404. **المطلوب:** دمج us018 و us019 (أو الاتنين في `dev`) من صاحب الكود.
## 17. بيزنس مشترك في module مش موجود في الـ build بيقف بالكامل (409 على كل حاجة) 🔴 (branch us019)

**إزاي تتكرر:** بيزنس اتعمل على branch الـ Orders (مشترك في module `order`). شغّل الـ backend من `mustafadiaa-public-link-website-us019`، وهو مافيهوش module `Order`.

**الدليل:** كل طلبات البيزنس بترجع `409 entitlements.invalid-state`، والطلبات دي هي: `/menu/settings` و `/staff/*` و `/reservations/*` و `/waiting-list/*` و `/floor-plans/*` و `/public-link/*`. السبب في `TenantEntitlements.ResolveAsync`: أي module code مش متسجّل في الـ registry (`!registry.TryGet(code)`) بيرجّع `InvalidState` للـ tenant كله، مش للـ module ده بس.

**المطلوب:**
1. module مش معروف في الـ build يتجاهَل (مع warning في الـ log)، بدل ما يوقّف كل الـ modules التانية.
2. دمج us018 و us019 عشان البيئة المحلية تشتغل بالاتنين.
---

# الجولة الثالثة: الـ Public Link CMS (branch us019)، 2026-09-25

اتجرّب على بيزنس جديد "Octopus Burger" (خدمة سريعة). الـ frontend على الـ branch `feature/public-link-us019`.

**اللي اشتغل من أوله لآخره:** إدارة الصفحات (إضافة من قالب، صفحة مربوطة بـ module، ترتيب، إظهار وإخفاء، حذف)، والأقسام (إضافة، نص منسّق، ترتيب)، والـ navigation بقوايم فرعية، والـ footer، والـ themes (تطبيق، رجوع للافتراضي)، واللغات، والـ SEO، والـ preview links (فتح المسودة على المتجر)، والنشر، والرجوع لإصدار قديم، واسترجاع إصدار كمسودة.

## 18. مفيش قراءة للمنيو في وضع المعاينة 🟡

`/v1/public/site-menu/{key}` بيقرا المنيو المنشور بس. أي منيو متربط في المسودة بس بيظهر فاضي في الـ preview link. **المطلوب:** endpoint للمعاينة (بنفس الـ header `X-Preview-Token`)، أو إن الـ preview read يرجّع محتوى المنيو.

## 19. رابط الـ preview اللي الـ backend بيبنيه بيحط الـ token بعد `#` 🟡

القالب `https://{host}/preview#t=…` بيحط السر في الـ fragment، والـ fragment مابيوصلش للسيرفر، فالمتجر (Next.js، server-side) مش هيقدر يقراه. الـ frontend دلوقتي بيبني `https://{host}/_preview?token=…`، وبيحوّل الـ token لـ cookie ويمسحه من شريط العنوان. **المطلوب:** نتفق على شكل واحد للرابط، ويتعدّل القالب في الـ backend.

## 20. المحتوى المربوط (Menu و Reservation) مالوش شكل إعدادات ولا validation 🟡

`ContentSourceDescriptor` مابيرجّعش أي وصف للـ `sourceSettings`، والـ providers بيقبلوا أي حاجة. الـ frontend عامل editor عام بيستنتج الإعدادات من المفاتيح المحفوظة. **المطلوب:** `settingsSchema` على الـ descriptor (الحقول وأنواعها والقيم الافتراضية)، و validation حقيقي في كل provider.

## 21. الـ catalogue مابيرجّعش كل الحدود 🟢

حد عمق القوايم في النص المنسّق (2)، وحد عدد العناصر (2000)، وأقصى طول لنص عنصر الـ navigation (40) متكتبين في الـ frontend، لأن `GET /catalogues` مابيرجّعهمش في `limits`. **المطلوب:** يترجعوا في `limits`، عشان الـ frontend والـ backend مايختلفوش.

## 22. مفيش طريقة تغيّر المحتوى اللي القسم مربوط بيه 🟢

تغيير منيو أو حجز مربوط بقسم بيتعمل دلوقتي بحذف القسم وإضافته تاني في نفس المكان، ولو الإضافة فشلت الـ frontend بيرجّع الربط القديم. **المطلوب:** `PUT …/sections/{id}/binding`، أو إن تعديل القسم يسمح بتغيير `contentKey`.

## 23. أسامي الـ catalogue مفاتيح ترجمة بس 🟢

الـ catalogue بيرجّع `labelKey` و `nameKey` (زي `sections.hero.fields.title`) من غير أي نص. الـ frontend عامل ترجمة لـ 100 مفتاح موجودين النهارده. أي نوع قسم أو حقل جديد هيظهر إنجليزي لحد ما حد يضيف ترجمته. **المطلوب:** نص عربي وإنجليزي جنب المفتاح، أو ملف ترجمة مشترك.

## 24. شكل الـ header لكل صفحة مالوش أي قيم 🟢

`UpdatePageLayoutRequest.Header` (وفي الـ domain `PageLayout.HeaderVariant`) بيقبل أي نص، والتوثيق بيقول إنه "variant من الـ theme". لكن ولا theme من التلاتة (default و warm و midnight) في `publiclink-catalogues.json` بيحدد أي variants للـ header، ومفيش validation على القيمة، والـ public read بيرجّعها زي ما هي. الـ frontend بيحافظ على القيمة المحفوظة، ومش عارض أي اختيار ليها. **المطلوب:** قايمة variants للـ header في كل theme جوه الـ catalogue (مفتاح + `labelKey`)، و validation على القيمة، أو شيل الحقل لو مش مستخدم.
## 25. التسجيل بإيميل موجود قبل كده مالوش أي رد يفرّق 🟡

`POST /v1/accounts/register` بيرجّع 200 حتى لو الإيميل مسجّل (`RegisterAccountCommandHandler` بيرجّع Success لما `existing is not null`) ومابيبعتش أي إيميل. فالمستخدم بيشوف شاشة "تحقّق من حسابك" ويستنّى رمز مش هييجي. كمان `POST /v1/accounts/verify-email` بيرجّع 200 لأي رمز لو الحساب متحقّق قبل كده، والفشل بيظهر بعدها بس في تسجيل الدخول (`identity.auth.invalid-credentials`). الـ frontend دلوقتي بيكتب تحت الرمز إن الإيميل المسجّل مش هيوصله رمز، ولو تسجيل الدخول بعد التحقّق فشل بيقول "الإيميل ده مسجّل بالفعل" ومعاه زرار تسجيل الدخول. **المطلوب:** يا إما 409 بكود `identity.account.email-taken` (الـ frontend جاهز له)، يا إما لو لازم نفضل enumeration-safe، يتبعت للإيميل الموجود رسالة "عندك حساب بالفعل — سجّل الدخول أو غيّر كلمة المرور". وكمان `verify-email` لحساب متحقّق مايرجّعش نجاح لرمز غلط.

## 26. إيميلات التحقّق مابتوصلش: Brevo بيرفض الطلب بـ 401 🟡

التسجيل بيرجّع 200، والـ worker بيحاول يبعت `identity.email-verification-otp` لـ `https://api.brevo.com/v3/smtp/email`، فـ Brevo بيرد بـ **401 `unauthorized`**. الرسالة بتتعاد 3 مرات وبعدين بتروح dead-letter (`identity.email.delivery-rejected`)، والمستخدم مابيوصلوش أي رمز، فمش هيقدر يكمّل إنشاء الحساب. الـ frontend مايقدرش يعرف، لأن الإرسال بيحصل بعد ما التسجيل رجّع نجاح. (البيئة: `environment: Testing`، الـ worker على `integration/order-us018-into-public-link-us019`، 27/9/2026). **السبب اللي طلع:** حساب Brevo مقفول على IPs معيّنة (Authorized IPs)، والـ IP بتاع الجهاز اتغيّر، فـ Brevo رد بـ "unrecognised IP address". بعد إضافة الـ IP الإيميلات وصلت. **المطلوب:** على السيرفرات الحقيقية يتضاف الـ IP الثابت بتاع السيرفر في Brevo (أو يتقفل التقييد في بيئة التطوير)، ويتسجّل في الـ log نص رسالة Brevo كامل مش الكود `unauthorized` بس، ويبقى فيه health check أو تنبيه لما مزوّد الإيميل يرفض الإرسال.

## 27. دور المالك (Owner) مابيتعملش خالص، وصفحة الأدوار بتظهر فاضية 🔴

أي بيزنس جديد بيفتح صفحة "الأدوار والصلاحيات" يلاقيها فاضية: `GET /v1/businesses/{id}/staff/roles` بيرجّع `data: []` (اتجرّب على "Octopus Burger"). التصميم في الـ backend بيقول إن دور Owner "real row with a real permission set" وإنه بيظهر أول واحد في القايمة (`RoleEndpoints` و `RoleRepository` بيرتّبوا `IsSystemRole` الأول)، و `Role.CreateSystemOwnerRole(...)` موجودة في الـ domain، **بس مفيش أي كود بيناديها**. و `IStaffBusinessSeeder` مكتوب فيه صراحةً إنه مابيعملش Owner role. النتيجة: صاحب الحساب عنده كل الصلاحيات فعلاً (من `Business.OwnerAccountId`)، بس مفيش دور ظاهر يوضّح ده، ومفيش حاجة يعمل منها "نسخ" عشان يبدأ دور جديد من الصلاحيات الكاملة. الـ frontend جاهز يعرض الدور ده (شارة "دور النظام"، أول القايمة، والمسموح عليه النسخ بس). **المطلوب:** لما البيزنس يتفعّل، يتعمل دور Owner (`IsSystemRole = true`) فيه كل الصلاحيات المعرّفة في الـ catalog، ويظهر في الـ list ومعاه صاحب الحساب كعضو فيه. أو الـ list يرجّعه derived لو مش عايزين row، بس بنفس الـ shape (`id` و `permissions`) عشان `GET /roles/{id}` والنسخ يشتغلوا.

## 28. الأدوار الافتراضية مابتتعملش في بيئة Docker 🟡

الـ worker بيكتب وقت تفعيل البيزنس: "No Staff seed profile matches business type 'restaurant' (variant 'fine-dining') and no default profile is configured. The business will start with empty catalogs." ملف `src/Modules/Staff/samples/staff-seed-profiles.development.json` فيه لمطعم 6 أدوار و 10 مسميات وظيفية و 6 أقسام وأنواع إجازات وشيفتات، بس مش متوصّل بإعدادات `docker-compose.yml`. نفس الكلام على `crm-profiles.development.json`. **المطلوب:** يتحمّل ملف الـ seed profiles في الـ worker في Docker (أو يتعمل `Default` profile)، ويتكتب ده في `README` أو `migrate.sh`.
