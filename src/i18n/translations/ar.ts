import type { TranslationKey } from "./en";

export const ar: Record<TranslationKey, string> = {
  // Index page
  "hero.title": "MovPrompt",
  "hero.subtitle": "مدير التصوير الذكي. حوّل أي صورة ثابتة إلى توجيه سينمائي احترافي.",
  "footer": "MovPrompt — توجيهات سينمائية بالذكاء الاصطناعي",

  // Workflows
  "workflow.single": "إطار واحد",
  "workflow.single.desc": "ارفع صورة واحدة. الذكاء الاصطناعي يكتب توجيه حركة الكاميرا المثالي.",
  "workflow.twoframe": "إطاران",
  "workflow.twoframe.desc": "ارفع إطار البداية والنهاية. الذكاء الاصطناعي يصنع انتقالاً سلساً.",
  "workflow.multishot": "لقطات متعددة",
  "workflow.multishot.desc": "ارفع مفهوماً واحداً. الذكاء الاصطناعي يولّد تسلسل قصة كامل.",

  // Guide
  "guide.title": "كيفية الاستخدام",
  "guide.step1.title": "اختر مسار العمل",
  "guide.step1.desc": "إطار واحد، انتقالات، أو لوحة قصة كاملة — اختر الوضع الذي يناسب رؤيتك.",
  "guide.step2.title": "أسقط إطارك",
  "guide.step2.desc": "اسحب وأفلت أي صورة مرجعية. الذكاء الاصطناعي يتولى الباقي.",
  "guide.step3.title": "انسخ وابدأ الإبداع",
  "guide.step3.desc": "بنقرة واحدة يتم توليد توجيه جاهز للإنتاج. الصقه في أي أداة فيديو ذكية.",

  // Auth
  "auth.signIn": "تسجيل الدخول",
  "auth.signOut": "تسجيل الخروج",
  "auth.signUp": "إنشاء حساب",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.createAccount": "إنشاء حساب",
  "auth.forgotPassword": "نسيت كلمة المرور؟",
  "auth.backToSignIn": "العودة لتسجيل الدخول",
  "auth.sendResetLink": "إرسال رابط إعادة التعيين",
  "auth.resetDesc": "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.",
  "auth.continueGoogle": "المتابعة مع Google",
  "auth.continueApple": "المتابعة مع Apple",
  "auth.or": "أو",
  "auth.mobileBrand": "سجّل الدخول لحفظ توجيهاتك والحصول على وصول كامل",
  "auth.heroTitle": "حوّل الصور إلى",
  "auth.heroCinema": "سينما",
  "auth.heroDesc": "أسقط إطاراً. اختر أسلوباً. احصل على توجيه سينمائي جاهز للصق في Kling أو Runway أو Wan أو أي أداة فيديو ذكية — في ثوانٍ.",
  "auth.trusted": "يستخدمه صانعو الأفلام والمبدعون وفنانو الفيديو بالذكاء الاصطناعي حول العالم",

  // Auth features
  "auth.feat.dop.title": "مصوّرك السينمائي الذكي",
  "auth.feat.dop.desc": "أسقط أي صورة — واحصل على توجيه فيديو احترافي مُصمّم للنموذج الذي تختاره.",
  "auth.feat.workflows.title": "صورة واحدة، ثلاثة مسارات",
  "auth.feat.workflows.desc": "لقطة واحدة، انتقال سلس، أو لوحة قصة كاملة — كل اتجاه إبداعي مغطى.",
  "auth.feat.save.title": "مكتبة توجيهاتك",
  "auth.feat.save.desc": "كل توجيه يُحفظ تلقائياً. أعد الزيارة، عدّل، وأعد استخدام أفضل أفكارك السينمائية.",

  // Auth toasts
  "toast.resetFailed": "فشل إعادة التعيين",
  "toast.checkEmail": "تحقق من بريدك",
  "toast.resetLinkSent": "أرسلنا لك رابط إعادة تعيين كلمة المرور.",
  "toast.signUpFailed": "فشل التسجيل",
  "toast.verificationSent": "أرسلنا لك رابط التحقق.",
  "toast.signInFailed": "فشل تسجيل الدخول",
  "toast.googleFailed": "فشل تسجيل الدخول بـ Google",
  "toast.appleFailed": "فشل تسجيل الدخول بـ Apple",

  // WorkflowPanel
  "wp.analyzeDesc": "سيقوم الذكاء الاصطناعي بتحليل مشهدك إلى عناصر فردية (الموضوع، الخلفية، الإضاءة، الأجواء) حتى تتحكم بدقة فيما يبقى ثابتاً وما يتحرك.",
  "wp.analyzeScene": "تحليل المشهد",
  "wp.analyzingScene": "جاري تحليل المشهد...",
  "wp.skip": "تخطي — انتقل مباشرة للتوليد",
  "wp.startOver": "البدء من جديد",
  "wp.reAnalyze": "إعادة التحليل",
  "wp.generatePrompt": "توليد توجيه سينمائي",
  "wp.regeneratePrompt": "إعادة توليد التوجيه",
  "wp.generatingPrompt": "جاري توليد التوجيه...",
  "wp.signInRequired": "تسجيل الدخول مطلوب",
  "wp.signInAnalyze": "يرجى تسجيل الدخول لتحليل المشاهد.",
  "wp.signInGenerate": "يرجى تسجيل الدخول لتوليد التوجيهات.",
  "wp.analysisFailed": "فشل تحليل المشهد",
  "wp.generationFailed": "فشل التوليد",
  "wp.somethingWrong": "حدث خطأ ما.",
  "wp.somethingWrongRetry": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",

  // Frame labels
  "frame.start": "إطار البداية",
  "frame.end": "إطار النهاية",
  "frame.concept": "صورة المفهوم",
  "frame.your": "إطارك",
  "frame.upload": "ارفع إطارك",
  "frame.uploadConcept": "ارفع صورة المفهوم",

  // ConfigPanel
  "config.describeVision": "صِف رؤيتك (اختياري)",
  "config.placeholder": "صِف رؤيتك... مثال: 'حركة بطيئة درامية مع مطر وأضواء نيون'",
  "config.targetModel": "نموذج الذكاء الاصطناعي المستهدف",
  "config.chooseModel": "اختر نموذجاً...",
  "config.anyModel": "أي نموذج — توجيه عام",

  // ResultsPanel
  "results.title": "التوجيهات المُولّدة",
  "results.copyAll": "نسخ الكل",
  "results.regenerate": "إعادة التوليد",
  "results.copied": "تم النسخ!",
  "results.mainPrompt": "التوجيه الرئيسي",
  "results.negativePrompt": "التوجيه السلبي",
  "results.cameraSuggestions": "اقتراحات الكاميرا",
  "results.modelNotes": "ملاحظات خاصة بالنموذج",

  // SceneBreakdown
  "scene.title": "عناصر المشهد",
  "scene.subtitle": "— حدد كل عنصر كثابت أو متحرك",
  "scene.lock": "تثبيت",
  "scene.move": "تحريك",
  "scene.elements": "عناصر",
  "scene.notePlaceholder": 'مثال: "اجعل الشعر يتطاير مع الريح"، "أضف تأثير المطر"...',

  // InstallPrompt
  "install.title": "تثبيت MovPrompt",
  "install.desc": "أضف إلى الشاشة الرئيسية لتجربة التطبيق الكاملة",
  "install.btn": "تثبيت",
  "install.iosDesc": "اضغط على {icon} ثم \"إضافة إلى الشاشة الرئيسية\" للتثبيت",

  // AnnouncementBanner
  "announcement.learnMore": "اعرف المزيد",

  // ImageUploadZone
  "upload.dragDrop": "اسحب وأفلت أو انقر للرفع",

  // Library
  "library.title": "مكتبة التوجيهات",
  "library.empty": "لا توجد توجيهات بعد. أنشئ أول توجيه سينمائي!",
  "library.generate": "أنشئ أول توجيه",
  "library.delete": "حذف",
  "library.searchPlaceholder": "ابحث في التوجيهات...",
  "library.clearFilters": "مسح الفلاتر",
  "library.noResults": "لا توجد نتائج مطابقة.",
  "library.resultsCount": "توجيهات",
};
