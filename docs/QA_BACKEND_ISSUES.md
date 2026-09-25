# مشاكل Backend من اختبار الـ Frontend

تاريخ: 2026-09-23 · البيئة: docker-compose المحلي (AdminApi :8081، PublicApi :8082)

كل بند فيه: المشكلة، إزاي تتكرر، الدليل، والمطلوب.

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

## 4. الـ worker مكانش بيوصل لـ RabbitMQ بعد الـ restart 🟡

**الدليل:** من 20:11:17 لحد 20:12:04 UTC كان فيه `BrokerUnreachableException: Connection failed, host 172.20.0.3:5672` كل 5 ثواني، وبعدها اتصل.

**المطلوب:** الـ worker يستنى الـ RabbitMQ يبقى healthy قبل ما يبدأ (`depends_on: condition: service_healthy` في الـ compose).

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

**المطلوب:** أي `DbUpdateConcurrencyException` يترجم لـ 409 `concurrency.stale`. ده في كل الـ modules، مش Menu بس.

## 8. الـ token المنتهي بيرجّع 403 بدل 401 على endpoints البيزنس 🔴

**الأثر:** بعد 15 دقيقة من غير نشاط، كل طلبات الصفحة بترجع 403 `authorization.forbidden` برسالة زي "does not hold the required permission 'staff.roles.read'". الـ frontend مضطر يعتبر الـ 403 ده كأنه token منتهي ويجدّد مرتين. ولو المستخدم فعلاً مالوش صلاحية، الـ frontend مش هيقدر يفرّق بين الحالتين.

**الدليل:** الساعة 21:26:15 و 21:43:18 UTC: `/v1/businesses` رجع 401، وفي نفس اللحظة `/orders` و `/staff/roles` رجعوا 403.

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

## 14. الأدوار والوظائف مابتتعملش للبيزنس الجديد 🟢 (BACKEND_GAPS 6.10)

تبويب الأدوار فاضي لبيزنس جديد. محتاجين `Staff:Seeding:Profiles` في الـ compose.