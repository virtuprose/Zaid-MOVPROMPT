export const en = {
  // Index page
  "hero.title": "MovPrompt",
  "hero.subtitle": "Your AI Director of Photography. Turn any still image into a director-grade cinematic video prompt.",
  "footer": "MovPrompt — AI-powered cinematic prompts",

  // Workflows
  "workflow.single": "Single Frame",
  "workflow.single.desc": "Upload one image. AI writes the perfect camera movement prompt.",
  "workflow.twoframe": "Two Frames",
  "workflow.twoframe.desc": "Upload start & end frames. AI crafts a seamless transition.",
  "workflow.multishot": "Multi-Shot",
  "workflow.multishot.desc": "Upload one concept. AI generates a full storyboard sequence.",

  // Guide
  "guide.title": "How to Use",
  "guide.step1.title": "Choose a Workflow",
  "guide.step1.desc": "Pick Single Frame, Two Frames, or Multi-Shot depending on your project.",
  "guide.step2.title": "Upload Your Image",
  "guide.step2.desc": "Drag & drop or click to upload your reference frame(s).",
  "guide.step3.title": "Generate & Copy",
  "guide.step3.desc": "Hit generate, review your cinematic prompt, and copy it to your clipboard.",

  // Auth
  "auth.signIn": "Sign In",
  "auth.signOut": "Sign Out",
  "auth.signUp": "Sign Up",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.createAccount": "Create Account",
  "auth.forgotPassword": "Forgot your password?",
  "auth.backToSignIn": "Back to sign in",
  "auth.sendResetLink": "Send Reset Link",
  "auth.resetDesc": "Enter your email and we'll send you a reset link.",
  "auth.continueGoogle": "Continue with Google",
  "auth.continueApple": "Continue with Apple",
  "auth.or": "or",
  "auth.mobileBrand": "Sign in to save your prompts & unlock full access",
  "auth.heroTitle": "Turn Stills Into",
  "auth.heroCinema": "Cinema",
  "auth.heroDesc": "AI-powered cinematic prompt generation. Upload a frame, choose your workflow, and get production-ready prompts for any video model.",
  "auth.trusted": "Trusted by filmmakers and creators worldwide",

  // Auth features
  "auth.feat.dop.title": "AI Director of Photography",
  "auth.feat.dop.desc": "Upload any frame and get cinematic video prompts tuned for top AI models.",
  "auth.feat.workflows.title": "3 Powerful Workflows",
  "auth.feat.workflows.desc": "Single Frame, Two Frames, or Multi-Shot Storyboard — pick your creative path.",
  "auth.feat.save.title": "Save & Reuse",
  "auth.feat.save.desc": "Sign in to keep your prompt history and revisit your best cinematic directions.",

  // Auth toasts
  "toast.resetFailed": "Reset failed",
  "toast.checkEmail": "Check your email",
  "toast.resetLinkSent": "We sent you a password reset link.",
  "toast.signUpFailed": "Sign up failed",
  "toast.verificationSent": "We sent you a verification link.",
  "toast.signInFailed": "Sign in failed",
  "toast.googleFailed": "Google sign-in failed",
  "toast.appleFailed": "Apple sign-in failed",

  // WorkflowPanel
  "wp.analyzeDesc": "AI will break down your scene into individual elements (subject, background, lighting, atmosphere) so you can control exactly what stays still and what moves.",
  "wp.analyzeScene": "Analyze Scene",
  "wp.analyzingScene": "Analyzing Scene...",
  "wp.skip": "Skip — Go Straight to Generate",
  "wp.startOver": "Start Over",
  "wp.reAnalyze": "Re-analyze",
  "wp.generatePrompt": "Generate Cinematic Prompt",
  "wp.generatingPrompt": "Generating Prompt...",
  "wp.signInRequired": "Sign in required",
  "wp.signInAnalyze": "Please sign in to analyze scenes.",
  "wp.signInGenerate": "Please sign in to generate prompts.",
  "wp.analysisFailed": "Scene analysis failed",
  "wp.generationFailed": "Generation failed",
  "wp.somethingWrong": "Something went wrong.",
  "wp.somethingWrongRetry": "Something went wrong. Please try again.",

  // Frame labels
  "frame.start": "Start Frame",
  "frame.end": "End Frame",
  "frame.concept": "Concept Image",
  "frame.your": "Your Frame",
  "frame.upload": "Upload your frame",
  "frame.uploadConcept": "Upload concept image",

  // ConfigPanel
  "config.describeVision": "Describe Your Vision (optional)",
  "config.placeholder": "Describe your vision... e.g. 'dramatic slow-motion with rain and neon lights'",
  "config.targetModel": "Target AI Model",
  "config.chooseModel": "Choose a model...",
  "config.anyModel": "Any Model — Universal Prompt",

  // ResultsPanel
  "results.title": "Generated Prompts",
  "results.copyAll": "Copy All",
  "results.regenerate": "Regenerate",
  "results.mainPrompt": "Main Prompt",
  "results.negativePrompt": "Negative Prompt",
  "results.cameraSuggestions": "Camera Suggestions",
  "results.modelNotes": "Model-Specific Notes",

  // SceneBreakdown
  "scene.title": "Scene Elements",
  "scene.subtitle": "— Mark each as Lock (static) or Move (animate)",
  "scene.lock": "Lock",
  "scene.move": "Move",
  "scene.elements": "elements",
  "scene.notePlaceholder": 'e.g. "make hair blow in wind", "add rain effect"...',

  // InstallPrompt
  "install.title": "Install MovPrompt",
  "install.desc": "Add to home screen for the full app experience",
  "install.btn": "Install",
  "install.iosDesc": "Tap {icon} then \"Add to Home Screen\" to install",

  // AnnouncementBanner
  "announcement.learnMore": "Learn more",

  // ImageUploadZone
  "upload.dragDrop": "Drag & drop or click to upload",
} as const;

export type TranslationKey = keyof typeof en;
