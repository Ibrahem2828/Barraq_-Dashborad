# مصفوفة تغطية لوحة تحكم برّاق

| المجال | المسار | الحالة في اللوحة |
|---|---|---|
| حساب المدير | `GET /admin/me/` | مفعّل للصلاحيات والتنقل |
| النظرة العامة | `GET /admin/overview/` | مفعّل بالكامل |
| صحة النظام | `GET /admin/system/health/` | مفعّل بالكامل |
| المستخدمون | `/admin/users/` | قائمة، بحث، فلاتر، تفاصيل، تفعيل وإيقاف |
| المديرون | `/admin/admin-users/` | قائمة، بحث، فلاتر، تفاصيل |
| الأدوار | `/admin/roles/` | قائمة وتفاصيل |
| الصلاحيات | `/admin/permissions/` | قائمة وتصنيف وتفاصيل |
| المراحل | `/admin/education-stages/` | قائمة وتفاصيل |
| المواد | `/admin/subjects/` | قائمة وتفاصيل |
| المصادر | `/admin/sources/` | قائمة، بحث، فلاتر، تفاصيل |
| المجلدات | `/admin/source-collections/` | قائمة وتفاصيل |
| الخطط | `/admin/study-plans/` | قائمة، فلاتر، تفاصيل |
| الاختبارات | `/admin/quizzes/` | قائمة، فلاتر، تفاصيل |
| المحاولات | `/admin/quiz-attempts/` | قائمة ونتائج وتفاصيل |
| AI Jobs | `/admin/ai-jobs/` | قائمة، فلاتر، تفاصيل وإلغاء |
| AI Metrics | `/admin/ai-jobs/metrics/` | بطاقات ومؤشرات |
| AI Feedback | `/admin/ai-feedback/` | قائمة وفلاتر وتفاصيل |
| Webhooks | `/admin/ai-webhook-events/` | قائمة ومتابعة الأخطاء |
| توصيات رشيد | `/admin/ai-recommendations/` | قائمة وتفاصيل |
| ملخصات خُلاصة | `/admin/ai-summaries/` | قائمة وتفاصيل |
| تفريغات صدى | `/admin/ai-transcriptions/` | قائمة وتفاصيل |
| الباقات | `/admin/subscription-plans/` | قائمة وتفاصيل |
| اشتراكات المستخدمين | `/admin/user-subscriptions/` | قائمة وتفاصيل |
| الاستهلاك | `/admin/subscription-usage/` | قائمة وتفاصيل |
| الدعم | `/admin/support-tickets/` | قائمة، فلاتر، تفاصيل، حل وإغلاق |
| التدقيق | `/admin/audit-logs/` | قائمة، بحث، تفاصيل |

## واجهات موصى بإضافتها لاحقاً إلى الباك أو خدمة AI

- مؤشرات P50/P95/P99 لزمن عمليات AI.
- تكلفة Tokens والصوت حسب المزود والنموذج والشخصية.
- حالة Workers وQueues وCelery Beat.
- Provider Accounts وCircuit Breaker وFailover.
- Prompt Versions وSchema Versions.
- RAG ingestion، عدد Chunks، جودة الاسترجاع وGroundedness.
- Training Candidates وDataset Versions وEvaluation Runs.
- Security events وHMAC replay attempts.
- Backup/restore status وdeployment versions.

يجب إخفاء هذه الوحدات في الواجهة إلى أن تتوفر عقود API رسمية ومحمية، بدلاً من استدعاء مسارات غير موجودة.
