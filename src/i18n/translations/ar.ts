import type { TranslationKey } from "./en";

export const ar: Record<TranslationKey, string> = {
  // Index page
  "hero.title": "MovPrompt",
  "hero.subtitle": "المخرج السينمائي الذكي: حوّل صورك الثابتة إلى كادرات سينمائية ملهمة",
  "footer": "MovPrompt — أوامر سينمائية بالذكاء الاصطناعي",

  // Workflows
  "workflow.single": "إطار واحد",
  "workflow.single.desc": "تفضل برفع الصورة هنا، وسأقوم بتحليلها بدقة واقتراح أمر حركة الكاميرا المثالي",
  "workflow.twoframe": "إطاران",
  "workflow.twoframe.desc": "ارفع إطار البداية والنهاية. الذكاء الاصطناعي يصنع انتقالاً سلساً.",
  "workflow.multishot": "لقطات متعددة",
  "workflow.multishot.desc": "ارفع مفهوماً واحداً. الذكاء الاصطناعي يولّد تسلسل قصة كامل.",

  // Guide
  "guide.title": "كيفية الاستخدام",
  "guide.step1.title": "اختر مسار العمل",
  "guide.step1.desc": "إطار واحد، انتقالات، أو لوحة قصة كاملة — اختر الوضع الذي يناسب رؤيتك.",
  "guide.step2.title": "ارفع الصورة",
  "guide.step2.desc": "اسحب أي صورة مرجعية، الذكاء الاصطناعي يتولى الباقي.",
  "guide.step3.title": "انسخ وابدأ الإبداع",
  "guide.step3.desc": "بنقرة واحدة يتم توليد أمر جاهز للإنتاج. ألصقه في أي أداة فيديو ذكية.",

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
  "auth.mobileBrand": "سجّل الدخول لحفظ اوامرك والحصول على وصول كامل",
  "auth.heroTitle": "حوّل الصور إلى",
  "auth.heroCinema": "سينما",
  "auth.heroDesc": "ارف إطاراً. اختر أسلوباً. احصل على أمر سينمائي جاهز للصق في Kling أو Veo أو Seedance أو أي أداة فيديو ذكية — في ثوانٍ.",
  "auth.trusted": "يستخدمه صانعو الأفلام والمبدعون وفنانو الفيديو بالذكاء الاصطناعي حول العالم",

  // Auth features
  "auth.feat.dop.title": "مصوّرك السينمائي الذكي",
  "auth.feat.dop.desc": "ارفع أي صورة — واحصل على امر فيديو احترافي مُصمّم للنموذج الذي تختاره.",
  "auth.feat.workflows.title": "صورة واحدة، ثلاثة مسارات",
  "auth.feat.workflows.desc": "لقطة واحدة، انتقال سلس، أو لوحة قصة كاملة — كل اتجاه إبداعي مغطى.",
  "auth.feat.save.title": "مكتبة اوامرك",
  "auth.feat.save.desc": "كل امر يُحفظ تلقائياً. أعد الزيارة، عدّل، وأعد استخدام أفضل أفكارك السينمائية.",

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
  "wp.analyzeDesc": "سيقوم الذكاء الاصطناعي بتحليل مشهدك إلى عناصر فردية \n(الموضوع، الخلفية، الإضاءة، الأجواء) حتى تتحكم بدقة فيما يبقى ثابتاً وما يتحرك",
  "wp.analyzeScene": "تحليل المشهد",
  "wp.analyzingScene": "جاري تحليل المشهد...",
  "wp.skip": "تخطي — انتقل مباشرة للتوليد",
  "wp.startOver": "البدء من جديد",
  "wp.reAnalyze": "إعادة التحليل",
  "wp.generatePrompt": "توليد أمر سينمائي",
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
  "frame.upload": "المشهد",
  "frame.uploadConcept": "ارفع صورة المفهوم",

  // ConfigPanel
  "config.describeVision": "صِف رؤيتك (اختياري)",
  "config.placeholder": "صِف رؤيتك... مثال: 'حركة بطيئة درامية مع مطر وأضواء نيون'",
  "config.targetModel": "نموذج الذكاء الاصطناعي المستهدف",
  "config.chooseModel": "اختر نموذجاً...",
  "config.anyModel": "أي نموذج — توجيه عام",

  // ResultsPanel
  "results.title": "الاوامر المُولّدة",
  "results.copyAll": "نسخ الكل",
  "results.regenerate": "إعادة التوليد",
  "results.copied": "تم النسخ!",
  "results.mainPrompt": "الامر الرئيسي",
  "results.negativePrompt": "الامر السلبي",
  "results.cameraSuggestions": "اقتراحات الكاميرا",
  "results.modelNotes": "ملاحظات خاصة بالنموذج",

  // SceneBreakdown
  "scene.title": "عناصر المشهد",
  "scene.subtitle": "— حدد كل عنصر كثابت، متحرك او تكتب الامر",
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
  "upload.dragDrop": "بانتظارك! ارفع الصورة الآن، وسأقوم فوراً بتحليل",

  // Library
  "library.title": "مكتبة الأوامر",
  "library.empty": "لا توجد اوامر بعد. أنشئ أول امر سينمائي!",
  "library.generate": "أنشئ أول امر",
  "library.delete": "حذف",
  "library.searchPlaceholder": "ابحث في الأوامر...",
  "library.clearFilters": "مسح الفلاتر",
  "library.noResults": "لا توجد نتائج مطابقة.",
  "library.resultsCount": "الأوامر",
  "library.singleFrame": "إطار واحد",
  "library.twoFrames": "إطاران",
  "library.multiShot": "متعدد اللقطات",
  "library.justNow": "الآن",
  "library.minsAgo": "د",
  "library.hrsAgo": "س",
  "library.daysAgo": "ي",
  "library.shot": "لقطة",
  "library.copy": "نسخ",
  "library.copyAll": "نسخ-الكل",
  "library.copied": "تم النسخ",
  "library.negative": "سلبي",
  "library.camera": "كاميرا",
  "library.notes": "ملاحظات",

  // Terms & Conditions
  "terms.back": "رجوع",
  "terms.title": "الشروط والأحكام",
  "terms.lastUpdated": "آخر تحديث",
  "terms.acceptance.title": "١. قبول الشروط",
  "terms.acceptance.body": "باستخدامك لـ MovPrompt، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق، يرجى عدم استخدام خدمتنا.",
  "terms.service.title": "٢. وصف الخدمة",
  "terms.service.body": "MovPrompt هي أداة مدعومة بالذكاء الاصطناعي تولّد اوامر فيديو سينمائية من الصور المرفوعة. تحلل الخدمة صورك وتنتج اوامر نصية واقتراحات كاميرا وملاحظات خاصة بالنموذج.",
  "terms.images.title": "٣. الصور المرفوعة",
  "terms.images.body": "برفعك للصور على MovPrompt، فإنك تمنحنا ترخيصاً غير حصري لتخزين ومعالجة وتحليل صورك لغرض تقديم الخدمة وتحسين نماذج الذكاء الاصطناعي. تُخزن الصور بشكل آمن ومرتبطة بحسابك. تحتفظ بملكية صورك الأصلية.",
  "terms.ip.title": "٤. الملكية الفكرية",
  "terms.ip.body": "الاوامر والاقتراحات المولّدة متاحة لاستخدامك الشخصي والتجاري. منصة MovPrompt وعلامتها التجارية والتقنية الأساسية تظل ملكيتنا الفكرية.",
  "terms.privacy.title": "٥. الخصوصية والبيانات",
  "terms.privacy.body": "نجمع بريدك الإلكتروني والصور المرفوعة. تُخزن الصور لكل مستخدم مع ضوابط الوصول — أنت والمسؤولون المعتمدون فقط يمكنكم الوصول لبياناتك. لا نبيع بياناتك الشخصية لأطراف ثالثة.",
  "terms.disclaimer.title": "٦. إخلاء المسؤولية",
  "terms.disclaimer.body": "MovPrompt مقدمة \"كما هي\" بدون ضمانات من أي نوع. لا نضمن أن الاوامر المولّدة ستنتج نتائج محددة في أي نموذج توليد فيديو.",
  "terms.changes.title": "٧. تعديل الشروط",
  "terms.changes.body": "نحتفظ بالحق في تعديل هذه الشروط في أي وقت. الاستمرار في استخدام الخدمة بعد التعديلات يعني قبول الشروط المحدثة.",
  "terms.contact.title": "٨. التواصل",
  "terms.contact.body": "لأي استفسارات حول هذه الشروط، تواصل معنا عبر موقعنا movprompt.com.",

  // Privacy Policy
  "privacy.title": "سياسة الخصوصية",
  "privacy.collect.title": "١. المعلومات التي نجمعها",
  "privacy.collect.body": "نجمع المعلومات التالية عند استخدامك لـ MovPrompt: بريدك الإلكتروني وبيانات المصادقة عند إنشاء حساب؛ الصور التي ترفعها للتحليل؛ الاوامر المولّدة والبيانات الوصفية المرتبطة؛ تحليلات استخدام مجهولة.",
  "privacy.use.title": "٢. كيف نستخدم معلوماتك",
  "privacy.use.body": "تُستخدم معلوماتك لـ: تقديم وتحسين خدمة MovPrompt؛ توليد الاوامر سينمائية من صورك؛ حفظ سجل الاوامر للرجوع إليه؛ إرسال اتصالات الخدمة المهمة؛ تحليل أنماط الاستخدام لتحسين المنصة. قد نستخدم الصور والاوامر لتدريب نماذج الذكاء الاصطناعي.",
  "privacy.storage.title": "٣. تخزين البيانات والأمان",
  "privacy.storage.body": "تُخزن بياناتك بشكل آمن باستخدام تشفير معياري. تُخزن الصور في تخزين سحابي خاص مع أمان على مستوى الصفوف — أنت والمسؤولون المعتمدون فقط يمكنكم الوصول لملفاتك.",
  "privacy.sharing.title": "٤. مشاركة البيانات",
  "privacy.sharing.body": "لا نبيع أو نؤجر أو نتاجر ببياناتك الشخصية لأطراف ثالثة. قد نشارك البيانات مع: مزودي الخدمات الذين يساعدون في تشغيل منصتنا؛ جهات إنفاذ القانون إذا تطلب القانون ذلك.",
  "privacy.cookies.title": "٥. ملفات تعريف الارتباط والتتبع",
  "privacy.cookies.body": "يستخدم MovPrompt ملفات تعريف ارتباط أساسية للمصادقة وإدارة الجلسات. نجمع بيانات تحليلية مجهولة. لا نستخدم متتبعات إعلانية من أطراف ثالثة.",
  "privacy.rights.title": "٦. حقوقك",
  "privacy.rights.body": "لديك الحق في: الوصول لبياناتك الشخصية؛ طلب حذف حسابك والبيانات المرتبطة؛ تصدير سجل الاوامر؛ إلغاء الاشتراك في الاتصالات غير الأساسية عبر رابط إلغاء الاشتراك.",
  "privacy.children.title": "٧. خصوصية الأطفال",
  "privacy.children.body": "MovPrompt غير مخصص للمستخدمين تحت ١٣ سنة. لا نجمع معلومات شخصية من الأطفال عن قصد.",
  "privacy.changes.title": "٨. تغييرات على هذه السياسة",
  "privacy.changes.body": "قد نحدث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بالتغييرات المهمة عبر البريد الإلكتروني أو إعلان داخل التطبيق.",
  "privacy.contact.title": "٩. تواصل معنا",
  "privacy.contact.body": "لأسئلة أو طلبات الخصوصية، تواصل معنا عبر موقعنا movprompt.com.",

  // Auth T&C
  "auth.agreeTerms": "أوافق على",
  "auth.termsLink": "الشروط والأحكام",
  "auth.privacyLink": "سياسة الخصوصية",
  "auth.mustAgreeTerms": "يجب الموافقة على الشروط والأحكام لإنشاء حساب.",

  // Unsubscribe
  "unsub.verifying": "جاري التحقق…",
  "unsub.verifyingDesc": "يرجى الانتظار أثناء التحقق من طلبك.",
  "unsub.title": "إلغاء الاشتراك",
  "unsub.desc": "اضغط أدناه لإلغاء الاشتراك من رسائل MovPrompt.",
  "unsub.alreadyTitle": "تم إلغاء الاشتراك مسبقاً",
  "unsub.alreadyDesc": "لقد ألغيت اشتراكك بالفعل من هذه الرسائل.",
  "unsub.invalidTitle": "رابط غير صالح",
  "unsub.invalidDesc": "رابط إلغاء الاشتراك هذا غير صالح أو منتهي الصلاحية.",
  "unsub.successTitle": "تم إلغاء الاشتراك",
  "unsub.successDesc": "تم إلغاء اشتراكك بنجاح. لن تتلقى المزيد من الرسائل منا.",
  "unsub.errorTitle": "حدث خطأ",
  "unsub.errorDesc": "لم نتمكن من معالجة طلبك. يرجى المحاولة لاحقاً.",
  "unsub.confirm": "تأكيد إلغاء الاشتراك",

  // NotFound
  "notFound.title": "عذراً! الصفحة غير موجودة",
  "notFound.home": "العودة للرئيسية",

  // ResetPassword
  "reset.passwordsMismatch": "كلمتا المرور غير متطابقتين",
  "reset.minLength": "كلمة المرور يجب أن تكون ٦ أحرف على الأقل",
  "reset.failed": "فشل إعادة التعيين",
  "reset.success": "تم تحديث كلمة المرور!",
  "reset.successDesc": "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
  "reset.invalidLink": "رابط إعادة التعيين غير صالح أو منتهي الصلاحية.",
  "reset.goSignIn": "الذهاب لتسجيل الدخول",
  "reset.backToApp": "العودة للتطبيق",
  "reset.setNew": "عيّن كلمة المرور الجديدة",
  "reset.newPassword": "كلمة المرور الجديدة",
  "reset.confirmPassword": "تأكيد كلمة المرور",
  "reset.updatePassword": "تحديث كلمة المرور",

  // AdminLogin
  "admin.accessDenied": "تم رفض الوصول",
  "admin.noPrivileges": "هذا الحساب لا يملك صلاحيات المسؤول.",
  "admin.signOutTry": "تسجيل الخروج وتجربة حساب آخر",
  "admin.title": "وصول المسؤول",
  "admin.signedInAs": "مسجل الدخول كـ",
  "admin.signInFailed": "فشل تسجيل الدخول",

  // ResultsPanel
  "results.failedCopy": "فشل النسخ",
};
