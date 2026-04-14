

# Add Marketing Content to Auth / Signup Page

## Overview
Transform the Auth page into a marketing-infused signup experience. Add feature highlights, social proof, and value propositions alongside the existing sign-in/sign-up form.

## Layout
Split layout on desktop (two columns), stacked on mobile:
- **Left column**: Marketing content (hero headline, 3 feature cards, tagline)
- **Right column**: Existing auth form (Google + email sign-in/sign-up)

On mobile (current 440px viewport), marketing content stacks above the form.

## Marketing Sections

### 1. Hero headline (left/top)
- "Turn Stills Into Cinema" with a supporting line about AI-powered cinematic prompts
- MovPrompt branding

### 2. Feature highlights (3 cards)
- **AI Director of Photography** -- Describe prompt generation from any image
- **3 Powerful Workflows** -- Single Frame, Two Frames, Multi-Shot
- **Save & Reuse** -- Prompt history for signed-in users

### 3. Trust line
- "Trusted by filmmakers and creators" or similar social proof placeholder

## Changes

### `src/pages/Auth.tsx`
- Wrap in a two-column grid (`md:grid-cols-2`)
- Left side: marketing content with feature cards, animated entrance
- Right side: existing auth card (unchanged logic)
- Mobile: marketing stacks above auth form with compact spacing
- Add ambient glow background consistent with the rest of the app

## Technical Notes
- No new files or dependencies -- all changes in `Auth.tsx`
- Uses existing UI components (Card) and Tailwind classes
- Matches the dark cinematic theme (primary cyan, accent amber)
- Framer Motion for staggered entrance animations

