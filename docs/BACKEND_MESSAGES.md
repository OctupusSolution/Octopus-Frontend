# رسايل الـ backend (للنسخ واللصق)

كل رسالة لوحدها، ومرتّبين من الأهم للأقل. رسالة الـ Roles (Owner Role) اتبعتت قبل كده ومش هنا.

---

## 1. رفع الصور

يا فرجاني فيه مشكلة في رفع الصور في المنيو والـ Public Link ومفيش ولا صورة بتتحفظ خالص لا لوجو ولا favicon ولا صور الأصناف

الـ upload ticket بيتمضي بـ folder فـ Cloudinary بيحفظ الصورة باسم folder/publicId
بس الـ endpoint بتاع
POST .../media-uploads/{uploadId}/complete
بيسأل الـ Admin API عن resources/image/upload/<publicId> من غير الفولدر فبيرجع 404 والنتيجة menu.media.verification-failed

كان فيه shim محلي بيحل ده بس مش موجود دلوقتي والـ AdminApiBaseAddress لسه متوجّه عليه (host.docker.internal:8443)

المطلوب إن الـ complete يتحقق بالـ public_id الكامل folder/publicId أو التوقيع يبقى بـ asset_folder بدل folder
وكمان resourceType يرجع lowercase (image) علشان يمشي مع الـ URL بتاع Cloudinary
والـ AdminApiBaseAddress يرجع للقيمة الافتراضية https://api.cloudinary.com/v1_1/

---

## 2. الـ token المنتهي بيرجع 403 بدل 401

فيه مشكلة في الـ auth لما الـ token بيخلص

بعد 15 دقيقة من غير نشاط كل الـ endpoints بتاعة الـ business بترجع 403 authorization.forbidden برسالة زي "does not hold the required permission 'staff.roles.read'" بدل 401
وفي نفس اللحظة GET /v1/businesses بيرجع 401 عادي
وجربت النهارده كمان: طلب من غير token خالص أو token متلاعب فيه أو منتهي كلهم بيرجعوا 403 على /staff/roles

ده مخلّي الـ Frontend مضطر يعتبر الـ 403 ده token منتهي ويعمل refresh ولو اليوزر فعلا مالوش صلاحية مش هنقدر نفرّق بين الحالتين

المطلوب إن لما الـ JWT يفشل في الـ validation (IDX10223 Lifetime validation failed) يرجع 401 في كل الـ endpoints وميوصلش لفحص الـ permissions أصلا

---

## 3. الـ concurrency بيرجع 500

فيه مشكلة لما طلبين بيعدّلوا نفس الحاجة في نفس اللحظة

جربنا طلبين
PUT /menu/menus/{id}/builder-progress
لنفس المنيو في نفس الوقت والتاني رجع 500 unexpected.error
السبب إن DbUpdateConcurrencyException مش متعالجة (correlationId 0de6771deb844f50852f27026e32da6d)

إحنا ظبطنا الـ Frontend علشان ميبعتش الطلب مرتين بس الـ backend لازم يتعامل مع الحالة دي

المطلوب إن أي DbUpdateConcurrencyException تترجم لـ 409 concurrency.stale وده في كل الـ modules مش المنيو بس

---

## 4. تفعيل دخول الموظف بيرجع 500

فيه مشكلة في دعوة الموظفين

POST /staff/members/{id}/login/enable
بيرجع 500 والخطأ:
InvalidOperationException: The Staff invitation transport key was not materialized at host startup. Configure Staff:InvitationTransport:KeySecretRef
(correlationId 845b3e16c62c42f4a59e213fff3c58e0)

يعني مفيش أي دعوة موظف هتشتغل

المطلوب نضيف Staff__InvitationTransport__KeySecretRef والـ secret بتاعه في الـ docker-compose زي مفاتيح الـ OTP

---

## 5. migrate.sh ناقصه tenant chains

فيه مشكلة في docker/migrate.sh

لما بنعمل docker compose run --rm migrate مش بيطبّق الـ chain بتاع PublicLinkContentDbContext ولا بتاع OrderDbContext
فالـ PublicApi بيرجع 500 بالخطأ 42703: column p.manifest does not exist لحد ما نطبّق الـ migration يدوي بـ dotnet ef database update --context PublicLinkContentDbContext

المطلوب نضيف PublicLinkContentDbContext وأي module عنده tenant chain خاص بيه (FloorPlan و Staff و Reservation و WaitingList و Order) لـ migrate.sh
أو إن الـ tenant chains تتطبّق تلقائي على الـ tenants الموجودين عند التحديث

---

## 6. module مش موجود في الـ build بيوقّف الـ business كله

فيه مشكلة في TenantEntitlements.ResolveAsync

لو business مشترك في module مش موجود في الـ build الحالي (زي business مشترك في order واتشغّل على branch مفيهوش الـ Order module) كل الطلبات بتاعته بترجع 409 entitlements.invalid-state
مش الـ module ده بس لأ كل حاجة: menu و staff و reservations و waiting-list و floor-plans و public-link

السبب إن أي module code مش متسجّل في الـ registry (!registry.TryGet(code)) بيرجع InvalidState للـ tenant كله

المطلوب إن الـ module اللي مش معروف يتجاهل مع warning في الـ log بدل ما يوقّف باقي الـ modules

---

## 7. الأدوار الافتراضية مش بتتعمل في Docker

ودي مكمّلة لمشكلة الـ Owner Role

غير الـ Owner كمان الأدوار الافتراضية مش بتتعمل للـ business الجديد
الـ worker بيكتب وقت التفعيل:
No Staff seed profile matches business type 'restaurant' (variant 'fine-dining') and no default profile is configured. The business will start with empty catalogs.

الملف src/Modules/Staff/samples/staff-seed-profiles.development.json فيه للمطعم 6 أدوار و10 مسميات وظيفية و6 أقسام وأنواع إجازات وشيفتات بس مش متوصّل بالـ docker-compose
ونفس الكلام على crm-profiles.development.json

المطلوب إن ملف الـ seed profiles يتحمّل في الـ worker في Docker أو نعمل Default profile ونكتب ده في الـ README

---

## 8. التسجيل بإيميل موجود قبل كده

فيه مشكلة في التسجيل لما الإيميل يكون متسجّل قبل كده

POST /v1/accounts/register
بيرجع 200 حتى لو الإيميل موجود (RegisterAccountCommandHandler بيرجع Success لما existing is not null) ومش بيبعت أي إيميل
فاليوزر بيفضل مستني كود مش هييجي

وكمان POST /v1/accounts/verify-email بيرجع 200 لأي كود لو الحساب متحقق قبل كده والغلط مش بيظهر غير في الـ login بعدها

ونفس الحكاية في resend-verification-code بيرجع 202 ومش بيبعت حاجة في الـ cooldown أو لما يعدّي الحد أو لو الإيميل متحقق أو مش موجود

إحنا عاملين حل مؤقت في الـ Frontend بيقول لليوزر إن الإيميل المسجّل مش هيوصله كود ولو الـ login فشل بعد التحقق بيقوله الإيميل ده مسجّل ومعاه زرار تسجيل الدخول

المطلوب يا إما يرجع 409 بكود identity.account.email-taken (الـ Frontend جاهز له)
يا إما لو لازم نفضل enumeration-safe يتبعت للإيميل الموجود رسالة "عندك حساب بالفعل سجّل الدخول أو غيّر الباسورد"
وكمان verify-email ميرجعش نجاح لكود غلط
والـ resend يرجع الوقت المتبقي من الـ cooldown بدل ما يسكت

---

## 9. كود الـ OTP في بيئة الـ dev

محتاجين طريقة نعرف بيها كود تأكيد الإيميل في الـ dev

دلوقتي الكود بيتبعت بإيميل حقيقي عن طريق Brevo ومش موجود في أي log والـ DB فيها hash بس
فأي اختبار أوتوماتيك أو اختبار بإيميلات وهمية بيقف عند شاشة الكود

المطلوب provider وهمي للـ Development زي Identity:Email:Provider=Log يكتب الكود في الـ log
أو endpoint للـ dev بس يرجع آخر كود لإيميل معيّن

---

## 10. رسالة Brevo في الـ log

إيميلات التحقق كانت مش بتوصل وBrevo كان بيرد 401 unauthorized والرسالة بتروح dead-letter بعد 3 محاولات

طلع السبب إن حساب Brevo مقفول على Authorized IPs والـ IP بتاع الجهاز اتغيّر وبعد ما ضفناه اشتغل
بس الـ log كان كاتب unauthorized بس فمكانش باين السبب

المطلوب نسجّل في الـ log نص رسالة Brevo كامل مش الكود بس
ويبقى فيه health check أو تنبيه لما مزوّد الإيميل يرفض الإرسال
وعلى السيرفرات الحقيقية نضيف الـ IP الثابت بتاع السيرفر في Brevo

---

## 11. دمج الـ integration branch في dev

الـ branch
integration/order-us018-into-public-link-us019
شغال تمام عندي والـ Orders والـ Public Link الجديد شغالين مع بعض

بس مكتوب في الـ merge commit إنه للاختبار بس ومش مدموج في dev

المطلوب الدمج ده يتعمل في dev علشان نشتغل عليه كلنا

---

## 12. الحجز من غير طاولة (محتاجين قرار)

دي محتاجة قرار منتج

CreateReservation بيشترط ResourceId أو GroupId
يعني أي مطعم منشرش مخطط قاعة مش هيقدر ياخد ولا حجز حتى الحجوزات اللي لسه قيد الانتظار

المطلوب نقرر يا إما نسمح بحجز من غير طاولة
يا إما نعمل مجموعة افتراضية "أي طاولة" تتعمل تلقائي مع الـ business

---

## 13. رسالة menu.settings.not-initialized

فيه رسالة خطأ مضلّلة في المنيو

CreateCatalogItem بيرجع menu.settings.not-initialized لما الإعدادات موجودة بس العملة null (في ApplyPrice)
فصعب نعرف السبب الحقيقي

إحنا ظبطنا الـ Frontend يحط SAR والمنطقة الزمنية

المطلوب خطأ مخصوص زي menu.settings.currency-missing
أو الأحسن إن إعدادات المنيو تتعمل تلقائي مع الـ business بعملته ومنطقته الزمنية زي ما Tenancy:Provisioning:Defaults بيعمل

---

## 14. API الفروع

محتاجين endpoint للفروع

المنيو والموظفين والإعدادات بيعرضوا فروع تجريبية (Jeddah - Corniche و Riyadh - Olaya) علشان مفيش endpoint بيرجع فروع الـ business

المطلوب endpoint يرجع فروع الـ business علشان نربطه

---

## 16. catalog.local.json

الـ worker كل 5 دقايق بيرمي warning:
FileNotFoundException: Could not find file '/catalog/catalog.local.json'

المطلوب نعمل mount للملف في الـ compose أو نظبط Onboarding:Catalog على samples/catalog.development.json

---

## 17. Redis حالته Degraded

GET /health على الـ AdminApi والـ PublicApi الاتنين بيرجعوا redis: Degraded
مع إن الـ container بتاع octopus-backend-redis-1 حالته healthy

وفيه containers تانية من Aspire شغالة في نفس الوقت (redis-bpxyqsyf وغيرها)

المطلوب نتأكد إن الـ connection string بتاع Redis بيشاور على الـ container الصح

---

## 18. validation report في المنيو

GET /menu/menus/{id}/validation-report
بيرجع code بس من غير أي رسالة

الـ Frontend بيترجم الأكواد اللي بتمنع النشر بس أي كود جديد هيظهر لليوزر زي ما هو

المطلوب نضيف message عربي وإنجليزي أو كتالوج رسمي للأكواد

---

## 19. المنيو في وضع المعاينة (Public Link)

GET /v1/public/site-menu/{key}
بيقرا المنيو المنشور بس
فأي منيو متربط في المسودة بس بيظهر فاضي في الـ preview link

المطلوب endpoint للمعاينة بنفس الـ header X-Preview-Token أو إن الـ preview read يرجع محتوى المنيو

---

## 20. شكل رابط الـ preview

القالب اللي الـ backend بيبنيه https://{host}/preview#t=… بيحط الـ token بعد #
والـ fragment مش بيوصل للسيرفر فالمتجر (Next.js server-side) مش هيعرف يقراه

الـ Frontend دلوقتي بيبني https://{host}/_preview?token=… وبيحوّل الـ token لـ cookie ويمسحه من الـ URL

المطلوب نتفق على شكل واحد للرابط ويتعدّل القالب في الـ backend

---

## 21. sourceSettings للمحتوى المربوط

ContentSourceDescriptor مش بيرجع أي وصف للـ sourceSettings والـ providers بتاعة المنيو والحجوزات بيقبلوا أي حاجة

الـ Frontend عامل editor عام بيخمّن الإعدادات من المفاتيح المحفوظة

المطلوب settingsSchema على الـ descriptor (الحقول وأنواعها والقيم الافتراضية) و validation حقيقي في كل provider

---

## 22. الحدود في الـ catalogue

GET /catalogues مش بيرجع كل الحدود في limits
عمق القوايم في النص المنسّق (2) وعدد العناصر (2000) وأقصى طول لعنصر الـ navigation (40) مكتوبين في الـ Frontend

المطلوب يرجعوا في limits علشان الـ Frontend والـ backend ميختلفوش

---

## 23. تغيير المحتوى المربوط بقسم

مفيش طريقة نغيّر المنيو أو الحجز المربوط بقسم
الـ Frontend دلوقتي بيمسح القسم ويضيفه تاني في نفس المكان ولو الإضافة فشلت بيرجع الربط القديم

المطلوب
PUT …/sections/{id}/binding
أو إن تعديل القسم يسمح بتغيير contentKey

---

## 24. أسامي الـ catalogue

الـ catalogue بيرجع labelKey و nameKey بس (زي sections.hero.fields.title) من غير نص

الـ Frontend عامل ترجمة للـ 100 مفتاح الموجودين دلوقتي بس أي نوع قسم أو حقل جديد هيظهر بالإنجليزي لحد ما حد يضيف ترجمته

المطلوب نص عربي وإنجليزي جنب المفتاح أو ملف ترجمة مشترك

---

## 25. شكل الـ header لكل صفحة

UpdatePageLayoutRequest.Header بيقبل أي نص والتوثيق بيقول إنه variant من الـ theme
بس ولا theme من التلاتة (default و warm و midnight) في publiclink-catalogues.json محدد له variants للـ header ومفيش validation على القيمة

فالـ Frontend مش عارض أي اختيار ليه وبيحافظ على القيمة المحفوظة بس

المطلوب قايمة variants للـ header في كل theme جوه الـ catalogue (مفتاح + labelKey) و validation على القيمة أو نشيل الحقل لو مش مستخدم
