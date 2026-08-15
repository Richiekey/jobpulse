-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    headline TEXT,
    years_of_experience INTEGER DEFAULT 0,
    skills TEXT[] DEFAULT '{}',
    target_roles TEXT DEFAULT '',
    preferred_location TEXT DEFAULT '',
    resume_url TEXT DEFAULT '',
    portfolio_url TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    github_url TEXT DEFAULT '',
    google_sheet_url TEXT DEFAULT '',
    google_sheet_webhook TEXT DEFAULT '',
    auto_sync_sheet BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- USER APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    job_url TEXT,
    location TEXT,
    salary TEXT,
    source TEXT,
    applied_at TIMESTAMPTZ DEFAULT now(),
    synced_to_sheet BOOLEAN DEFAULT false,
    sync_error TEXT,
    UNIQUE(user_id, job_id)
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view own applications" ON public.user_applications
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own applications" ON public.user_applications
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own applications" ON public.user_applications
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Service role bypass for API routes
DO $$ BEGIN
    CREATE POLICY "Service full access profiles" ON public.profiles
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Service full access user_applications" ON public.user_applications
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Auto create profile on auth.user created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''), now(), now())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
