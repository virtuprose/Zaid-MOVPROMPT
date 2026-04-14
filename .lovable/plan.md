

## VidoPrompt — AI Director of Photography

### Design
- **Dark cinematic theme**: Deep blacks/dark grays (#0a0a0f base), neon accent colors (cyan/blue for primary actions, warm amber for highlights), subtle film grain textures
- **Typography**: Modern, clean sans-serif — bold headings with a cinematic feel
- **Layout**: Single-page app with workflow tabs

### Pages & Components

**1. Landing / Upload Page**
- Hero section with tagline and animated background
- Three workflow cards: Single Frame, Two Frames, Multi-Shot — each with icon, description, and upload zone
- Drag-and-drop image upload areas (1 image for Single/Multi-Shot, 2 for Two Frames)
- Image preview with thumbnail after upload

**2. Configuration Panel (shown after upload)**
- **Cinematic Style** selector: Film Noir, Cyberpunk, Magical Realism, 35mm Film, Anamorphic, Documentary, etc.
- **Target Model** selector: Runway Gen-3, Kling, Luma, Veo, Sora
- "Generate Prompt" button

**3. Results Panel**
- Structured output cards:
  - **Main Prompt** (copyable)
  - **Negative Prompt** (copyable)
  - **Camera Suggestions** (movement, lens, angle)
  - **Model-Specific Notes**
- For Multi-Shot: multiple shot cards (Wide, Medium, Close-up, etc.) each with their own prompt
- Copy-all and regenerate buttons

**4. Optional Auth**
- Sign in / sign up modal (email + Google via Lovable Cloud)
- Prompt history page for logged-in users (saved generations with thumbnails)

### AI Backend (Lovable Cloud)
- Edge function calling Lovable AI (Gemini with vision) to:
  - Analyze uploaded image(s) — detect scene, lighting, subjects, depth
  - Generate structured cinematic prompts based on workflow type, style, and target model
  - Return JSON with main prompt, negative prompt, camera suggestions, model notes
- Image uploads stored in Supabase Storage bucket
- Prompt history saved to database for authenticated users

### Database (Lovable Cloud)
- `generations` table: user_id (nullable), workflow_type, style, target_model, image_urls, result_json, created_at
- Storage bucket for uploaded images

### Workflows
1. **Single Frame**: Upload 1 image → configure style/model → AI analyzes scene → returns camera movement prompt
2. **Two Frames**: Upload start + end frame → AI determines transition path → returns interpolation prompt
3. **Multi-Shot**: Upload 1 concept image → AI generates 3-5 shot storyboard with varied camera angles

