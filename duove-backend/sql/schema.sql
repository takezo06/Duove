-- ============================================================
-- Duove – Master Database Schema
-- Run this entire script in your Supabase SQL Editor.
-- Includes: tables, primary keys, foreign keys (with CASCADE),
-- indexes, RLS enablement, and row‑level security policies.
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  timezone_offset text DEFAULT '+00:00'::text,
  can_track_cycles boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  last_active timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Relationships
CREATE TABLE public.relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'dissolved'::text])),
  created_at timestamp with time zone DEFAULT now(),
  paired_at timestamp with time zone,
  CONSTRAINT relationships_pkey PRIMARY KEY (id),
  CONSTRAINT relationships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT relationships_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 3. Daily Usage
CREATE TABLE public.daily_usage (
  user_id uuid NOT NULL,
  date date NOT NULL,
  letter_count integer DEFAULT 0,
  qa_count integer DEFAULT 0,
  CONSTRAINT daily_usage_pkey PRIMARY KEY (user_id, date),
  CONSTRAINT daily_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 4. Cravings
CREATE TABLE public.cravings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL,
  user_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  content text NOT NULL,
  fulfilled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cravings_pkey PRIMARY KEY (id),
  CONSTRAINT cravings_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.relationships(id) ON DELETE CASCADE,
  CONSTRAINT cravings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT cravings_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 5. Letters
CREATE TABLE public.letters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text,
  image_url text,
  spotify_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT letters_pkey PRIMARY KEY (id),
  CONSTRAINT letters_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.relationships(id) ON DELETE CASCADE,
  CONSTRAINT letters_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT letters_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 6. Cycle Logs
CREATE TABLE public.cycle_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL,
  user_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cycle_logs_pkey PRIMARY KEY (id),
  CONSTRAINT cycle_logs_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.relationships(id) ON DELETE CASCADE,
  CONSTRAINT cycle_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 7. QA Prompts
CREATE TABLE public.qa_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  text text NOT NULL,
  category text DEFAULT 'relationship'::text CHECK (category = ANY (ARRAY['relationship'::text, 'mental_health'::text])),
  assigned_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qa_prompts_pkey PRIMARY KEY (id)
);

-- 8. QA Answers
CREATE TABLE public.qa_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL,
  relationship_id uuid NOT NULL,
  user_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  answer_text text NOT NULL,
  image_url text,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qa_answers_pkey PRIMARY KEY (id),
  CONSTRAINT qa_answers_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT qa_answers_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.qa_prompts(id) ON DELETE CASCADE,
  CONSTRAINT qa_answers_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.relationships(id) ON DELETE CASCADE,
  CONSTRAINT qa_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 9. Refresh Tokens
CREATE TABLE public.refresh_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  revoked boolean DEFAULT false,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 10. Audit Logs
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- Performance Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON public.relationships (user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_partner_id ON public.relationships (partner_id);
CREATE INDEX IF NOT EXISTS idx_relationships_status ON public.relationships (status);
CREATE INDEX IF NOT EXISTS idx_relationships_invite_code ON public.relationships (invite_code);

CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON public.daily_usage (date);

CREATE INDEX IF NOT EXISTS idx_cravings_relationship_id ON public.cravings (relationship_id);
CREATE INDEX IF NOT EXISTS idx_cravings_user_id ON public.cravings (user_id);

CREATE INDEX IF NOT EXISTS idx_letters_relationship_id ON public.letters (relationship_id);
CREATE INDEX IF NOT EXISTS idx_letters_sender_id ON public.letters (sender_id);
CREATE INDEX IF NOT EXISTS idx_letters_recipient_id ON public.letters (recipient_id);

CREATE INDEX IF NOT EXISTS idx_cycle_logs_relationship_id ON public.cycle_logs (relationship_id);
CREATE INDEX IF NOT EXISTS idx_cycle_logs_user_id ON public.cycle_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_logs_start_date ON public.cycle_logs (start_date);

CREATE INDEX IF NOT EXISTS idx_qa_answers_relationship_id ON public.qa_answers (relationship_id);
CREATE INDEX IF NOT EXISTS idx_qa_answers_prompt_id ON public.qa_answers (prompt_id);
CREATE INDEX IF NOT EXISTS idx_qa_answers_user_id ON public.qa_answers (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cravings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Relationships
CREATE POLICY "relationships_select_own" ON public.relationships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = partner_id);
CREATE POLICY "relationships_insert_own" ON public.relationships FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "relationships_update_own" ON public.relationships FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = partner_id)
    WITH CHECK (auth.uid() = user_id OR auth.uid() = partner_id);

-- Daily Usage
CREATE POLICY "daily_usage_select_own" ON public.daily_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_usage_insert_own" ON public.daily_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_usage_update_own" ON public.daily_usage FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cravings
CREATE POLICY "cravings_select_own_relationship" ON public.cravings FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())));
CREATE POLICY "cravings_insert_own_relationship" ON public.cravings FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())));
CREATE POLICY "cravings_update_own_relationship" ON public.cravings FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())));

-- Letters
CREATE POLICY "letters_select_own_relationship" ON public.letters FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())));
CREATE POLICY "letters_insert_own_relationship" ON public.letters FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())));

-- Cycle Logs
CREATE POLICY "cycle_logs_select_own_relationship" ON public.cycle_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())));
CREATE POLICY "cycle_logs_insert_own_relationship" ON public.cycle_logs FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())));

-- QA Answers
CREATE POLICY "qa_answers_select_own_relationship" ON public.qa_answers FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.relationships r WHERE r.id = relationship_id AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())));
CREATE POLICY "qa_answers_insert_own" ON public.qa_answers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Refresh Tokens
CREATE POLICY "refresh_tokens_select_own" ON public.refresh_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "refresh_tokens_insert_own" ON public.refresh_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "refresh_tokens_update_own" ON public.refresh_tokens FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Audit Logs
CREATE POLICY "audit_logs_select_own" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
