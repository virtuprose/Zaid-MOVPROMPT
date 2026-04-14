

# Add User Authentication (Email + Google)

## Overview
Add full authentication with Email/Password and Google sign-in. Public users can sign up to save prompt history. Admin dashboard gets proper role-based access replacing the hardcoded password.

## Database Changes

### 1. Profiles table
Create `profiles` table linked to `auth.users` with auto-creation trigger.

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. User roles table
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

### 3. Prompt history table
```sql
CREATE TABLE public.prompt_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workflow_type text NOT NULL,
  target_model text NOT NULL,
  results jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history" ON public.prompt_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.prompt_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
```

## New Files

### `src/pages/Auth.tsx`
Login/signup page with:
- Email/password form (sign up + sign in tabs)
- Google sign-in button (using `lovable.auth.signInWithOAuth("google")`)
- Redirect to `/` after successful auth

### `src/components/AuthGuard.tsx`
Wrapper component that checks auth state. Used to protect `/admin` route (requires admin role).

### `src/hooks/useAuth.ts`
Custom hook wrapping `supabase.auth.onAuthStateChange` and `getSession`. Exposes `user`, `session`, `loading`, `signOut`.

## Modified Files

### `src/App.tsx`
- Add `/auth` route
- Wrap `/admin` with AuthGuard requiring admin role

### `src/pages/Index.tsx`
- Add small user avatar/sign-in button in the header
- Show "Save to history" option after generation if logged in

### `src/pages/Analytics.tsx`
- Remove hardcoded password gate
- Use AuthGuard + role check instead

### `src/components/WorkflowPanel.tsx`
- After successful generation, save results to `prompt_history` if user is logged in

## Technical Notes
- Google OAuth uses Lovable Cloud's managed solution (no API keys needed)
- Email verification required before sign-in (no auto-confirm)
- The main app remains fully usable without an account
- Admin role must be manually assigned via database after first signup

