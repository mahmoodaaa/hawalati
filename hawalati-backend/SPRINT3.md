# Hawalati MVP — Sprint 3: User Profile, Documents & Demo KYC

> **الحالة:** مُنفّذ ومجرَّب وظيفيًا عبر Swagger على البيئة المحلية (بحسب نتائج الاختبارات المرسلة).  
> **Stack:** Java 21 · Spring Boot 4.1.2 · Spring Security/JWT · PostgreSQL · Spring Data JPA · Lombok Builder  
> **تاريخ التوثيق:** 28 أكتوبر 2026  
> **النطاق:** Backend فقط — ربط React مؤجّل إلى Sprint 5.

## 1. الهدف

إكمال رحلة المستخدم بعد التسجيل وتأكيد OTP من Sprint 2، بحيث يتمكن من:

1. عرض ملفه الشخصي وتعديل البيانات المسموحة.
2. تغيير كلمة المرور والتحقق من القديمة.
3. رفع وثيقة تجريبية أو استبدالها (صورة أو PDF).
4. تنفيذ **KYC تجريبي فقط** بعد رفع الوثيقة.

> لا يوجد تحقق هوية حقيقي، ولا تكامل فعلي مع سند، ولا OCR/Face Recognition. نستخدم بيانات ووثائق وهمية أثناء العرض.

## 2. رحلة المستخدم

```text
Register → Verify OTP → Access Token
                          ↓
                  GET /api/user/profile
                          ↓
                 PUT /api/user/document
                          ↓
                   POST /api/user/kyc
                          ↓
                   KYC = DEMO_VERIFIED
```

- `documentType` يتم اختياره خلال واجهة التسجيل؛ **ملف الوثيقة نفسه يُرسل بعد نجاح OTP** لأن API الرفع محمية بالـ Access Token.
- عند ربط React في Sprint 5: يمكن إبقاء الملف مؤقتًا في حالة واجهة التسجيل ثم رفعه فور الحصول على التوكن، مع إظهار خطأ وإعادة المحاولة إذا فشل الرفع.

## 3. الملفات الجديدة

| الملف | الوظيفة |
|---|---|
| `entity/UserDocument.java` | سجل وثيقة واحد حاليًا لكل مستخدم، بعلاقة One-to-One مع `User` |
| `repository/UserDocumentRepository.java` | `findByUserId` و`existsByUserId` |
| `service/UserService.java` | Interface لإدارة البروفايل وكلمة المرور والوثائق وKYC |
| `service/impl/UserServiceImpl.java` | منطق الأعمال الخاص بالـ APIs |
| `service/DocumentStorageService.java` | Interface لحفظ/حذف الملف |
| `service/impl/DocumentStorageServiceImpl.java` | تخزين محلي باسم UUID وفحص الحجم ونوع الملف |
| `controller/UserController.java` | REST endpoints تحت `/api/user` |
| `security/SecurityUtils.java` | الحصول على معرّف المستخدم الحالي من Security Context |
| `config/StorageProperties.java` | قراءة مسار التخزين `app.storage.documents-dir` |
| `dto/response/DocumentResponse.java` | Metadata للوثيقة بدون كشف مسار التخزين الداخلي |
| `dto/response/KycResponse.java` | حالة KYC مع العلم `demo` ورسالة توضيحية |

### الملفات المعدَّلة

- `dto/response/UserProfileResponse.java`: إضافة `documentUploaded`.
- `dto/request/UpdateProfileRequest.java` و`ChangePasswordRequest.java`: ضبط الأمثلة/التحقق المناسب للطلبات.
- `mapper/UserMapper.java`: تحويل يدوي باستخدام Lombok `@Builder`، بلا ModelMapper.
- `exception/GlobalExceptionHandler.java`: معالجة أخطاء رفع الملفات والطلبات.
- `config/SecurityConfig.java`: حماية `/api/user/**` مع CORS وBearer JWT.
- `.gitignore`: تجاهل ملفات `uploads/`.
- `entity/UserDocument.java`: السماح بتحديث `uploadedAt` عند استبدال الوثيقة.

## 4. APIs المنفَّذة

جميع المسارات التالية **تتطلب Access Token** عبر:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

| Method | Endpoint | ماذا يفعل؟ |
|---|---|---|
| `GET` | `/api/user/profile` | يجلب بروفايل المستخدم المصادَق عليه |
| `PUT` | `/api/user/profile` | يعدّل الحقول المسموحة فقط |
| `PUT` | `/api/user/change-password` | يتحقق من كلمة المرور الحالية، يحفظ BCrypt Hash جديدًا ويلغي Refresh Tokens النشطة |
| `PUT` | `/api/user/document` | رفع/استبدال الوثيقة عبر `multipart/form-data`، `file` إجباري و`documentType` اختياري |
| `GET` | `/api/user/document` | يرجع بيانات الوثيقة (metadata) **وليس محتوى الملف** |
| `POST` | `/api/user/kyc` | محاكاة نجاح KYC بعد رفع الوثيقة في وضع Demo |

**لا نرسل `userId` من React** لاختيار صاحب الوثيقة أو البروفايل؛ يُستخرج المستخدم من JWT عبر `SecurityUtils`.

## 5. قواعد الأعمال

### Profile

- الحقول القابلة للتعديل: `fullName`, `fullNameEn`, `dateOfBirth`, `placeOfBirth`, `address`, `phone`, `username`.
- لا يُعدّل `nationalId` أو `password` أو `enabled` أو `kycStatus` من `UpdateProfileRequest`.
- يُفحص عدم تكرار `username` و`phone`.
- عند تغيير الاسم أو تاريخ الميلاد بعد التحقق، تعود `kycStatus` إلى `PENDING`.

### Change Password

- يتطلب كلمة المرور القديمة (`currentPassword`) والجديدة (`newPassword`).
- التحقق باستخدام `PasswordEncoder.matches`، وتُحفظ الجديدة باستخدام BCrypt.
- بعد النجاح تُلغى Refresh Tokens النشطة؛ **Access Token الصادر مسبقًا لا يُلغى فورًا** ويظل صالحًا حتى انتهاء مدته.

### User Document

- امتدادات/أنواع مقبولة: JPEG أو PNG أو PDF؛ الحد الأعلى 5 MB.
- يُفحص توقيع الملف الأولي (magic bytes)، ويُحفظ باسم داخلي عشوائي UUID في `uploads/documents`؛ قاعدة البيانات تحفظ metadata فقط.
- `user_documents.user_id` فريد؛ الاستبدال يحدث في سجل الوثيقة نفسه ويُحدّث `uploadedAt`.
- تم اقتراح/تطبيق تنظيم تنظيف الملفات حول نجاح أو فشل DB Transaction: حذف الملف القديم بعد Commit، وحذف الجديد عند Rollback. **يجب التحقق من الحذف الفعلي من المجلد محليًا**؛ نجاح الـ API وحده لا يثبته.
- فحص magic bytes وحده لا يعتبر فحصًا كاملًا لمحتوى ملف غير موثوق.

### Demo KYC

- يتطلب مستخدمًا مفعّلًا ووثيقة مرفوعة.
- في وضع Demo يُغيّر `kycStatus` إلى `DEMO_VERIFIED`.
- `documentVerified` قد يبقى `false` لأن رفع الملف ليس تحققًا رسميًا من الوثيقة.
- وضع المحاكاة مخصص للعرض المحلي فقط؛ لا يُستخدم مع بيانات أو عمليات مالية حقيقية.

## 6. تصميم قاعدة البيانات

```text
users (Sprint 1)
  id (UUID, PK)
  ...
  document_type
  kyc_status

user_documents (Sprint 3)
  id (UUID, PK)
  user_id (UUID, UNIQUE FK → users.id)
  document_type
  stored_file_name
  content_type
  file_size
  uploaded_at
```

الملف نفسه موجود في مجلد التخزين المحلي، **ليس** في PostgreSQL.

## 7. الاختبارات اليدوية التي نجحت بالفعل

الاختبارات التالية وُثّقت عبر ردود Swagger ونتيجة قاعدة البيانات التي تمت مشاركتها:

| الاختبار | النتيجة المرصودة |
|---|---|
| `GET /api/user/profile` بتوكن Access صالح | `200 OK` وإظهار بيانات الحساب |
| رفع الوثيقة | `200 OK` |
| استبدال وثيقة `passport` (JPEG) بوثيقة `national_id` (PDF) | `200 OK`؛ نفس Document UUID، النوع والحجم والتاريخ تحدّثوا |
| `GET /api/user/document` | `200 OK` مع metadata |
| فحص جدول `user_documents` | سجل واحد مُحدَّث للوثيقة |
| `POST /api/user/kyc` | `200 OK`، `status: DEMO_VERIFIED`, `demo: true` |
| `GET /api/user/profile` بعد KYC | `documentUploaded: true` و`kycStatus: DEMO_VERIFIED` |
| `PUT /api/user/profile` مع تغيير تاريخ الميلاد | `200 OK`؛ تغير التاريخ وعادت `kycStatus` إلى `PENDING` بدون تعديل الرقم الوطني |
| `PUT /api/user/change-password` | `200 OK` |
| تجربة تسجيل الدخول بعد تغيير كلمة المرور | القديمة فشلت، والجديدة نجحت وأرسلت إلى OTP |

### لم نؤكد بعد بهذه السلسلة من الاختبارات

- حذف ملف الوثيقة القديم من `uploads/documents` بعد الاستبدال.
- حالات الفشل: ملف فوق 5MB، نوع غير مدعوم، طلب بدون توكن، مستخدم مختلف، تكرار Username/Phone.
- Refresh/Logout regression tests بعد تغيير كلمة المرور.
- إعادة تشغيل كاملة والتحقق من بقاء الملفات والبيانات.

## 8. ملاحظة مفتوحة للربط مع React (Sprint 5)

لوحظ أن **`login` قد يرجع `documentUploaded: false`** رغم أن `GET /api/user/profile` يعيد `true`؛ لأن بعض ردود Auth تعتمد مباشرةً على `UserMapper` دون قراءة وجود السجل في `user_documents`.

**الإجراء المقترح في Sprint 5:** جعل `/api/user/profile` مصدر الحقيقة لحالة الوثيقة بعد تسجيل الدخول، أو توحيد بناء User Profile Response في خدمات Auth وUser.

## 9. كيف تختبر محليًا؟

1. شغّل PostgreSQL وقاعدة `hawalati_db`.
2. عرّف `DB_PASSWORD` و`JWT_SECRET` في IntelliJ Environment Variables ولا تحفظهما في GitHub.
3. فعّل وضع Demo المحلي المناسب لإعدادات المشروع (`app.otp.demo-enabled=true` / Demo Profile عند استخدامه).
4. شغّل Spring Boot وافتح Swagger: `http://localhost:7171/swagger-ui/index.html`.
5. سجل حسابًا تجريبيًا وتحقق من OTP، ثم استخدم زر **Authorize** مع Access Token.
6. نفّذ APIs حسب الترتيب: Profile → Document Upload → Get Document → KYC → Update Profile → Change Password.

**تنبيه:** لم يتم ربط React بالـ Backend ضمن Sprint 3، ولا ينبغي اعتبار هذا النظام جاهزًا للإنتاج أو للتحقق الفعلي من الهويات.

## 10. ما التالي؟

- **Sprint 4 — Remittances:** `MockRemittance`, `Transaction`, Lookup, Receive, History، ومنع الاستلام المكرر.
- **Sprint 5 — React Integration:** استبدال `localStorage` وmock APIs، وربط خطوات التسجيل ورفع الوثيقة والحوالات بالـ Backend.
