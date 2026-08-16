-- Crypto Clarity AI lifetime entitlements.
-- Apply only after confirming the target Supabase project is the intended production entitlement store.

create table if not exists public.ccai_entitlements (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text unique,
  access_code_hash text not null unique,
  status text not null default 'active' check (status in ('active', 'revoked')),
  amount_total integer,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text
);

create index if not exists ccai_entitlements_email_idx
  on public.ccai_entitlements (lower(email));

create index if not exists ccai_entitlements_status_idx
  on public.ccai_entitlements (status);

alter table public.ccai_entitlements enable row level security;

-- There are intentionally no anon/authenticated RLS policies. Browser clients must not
-- read entitlement rows directly. Vercel functions access the table using a server-only
-- Supabase service-role key.
revoke all on table public.ccai_entitlements from anon, authenticated;
