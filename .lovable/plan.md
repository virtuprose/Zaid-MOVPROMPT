

# Welcome Email After Signup

## Overview
Send a branded welcome email to every new user after they sign up, encouraging them to stay tuned for new features.

## Prerequisites (in order)
Since no email domain is configured yet, we need to set one up first.

### Step 1: Set up email domain
You'll need to configure a sender domain so emails come from your brand (e.g., `notify@yourdomain.com`). This is done through a setup dialog — you'll add DNS records at your domain provider.

### Step 2: Set up email infrastructure
Database tables, queues, and background processing for reliable email delivery.

### Step 3: Scaffold transactional email system
Creates the Edge Functions needed to send app emails.

### Step 4: Create welcome email template
A React Email template at `_shared/transactional-email-templates/welcome.tsx` with:
- MovPrompt branding (cyan/dark theme colors adapted for email — white background with cyan accents)
- Heading: "Welcome to MovPrompt"
- Body: warm welcome message, excitement about what's coming, encouragement to explore
- CTA button linking to the app

### Step 5: Wire up the trigger
After successful signup in `Auth.tsx`, call `send-transactional-email` with the welcome template. Also handle Google OAuth signups by detecting first login in the auth state listener.

### Step 6: Create unsubscribe page
A branded `/unsubscribe` page (required for compliance) matching the app's dark cinematic style.

## First Action
The first step is setting up your email domain. You'll see a dialog to enter your domain and configure DNS records.

