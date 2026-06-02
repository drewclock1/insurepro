-- ============================================================
-- INSURANCE PLATFORM — FULL SCHEMA
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
create type user_role as enum ('rep', 'manager', 'admin', 'agency_owner');
create type lead_stage as enum ('new', 'contacted', 'quoted', 'appointment', 'applied', 'issued', 'declined', 'lost');
create type recruit_stage as enum ('prospect', 'contacted', 'interviewing', 'contracting', 'licensed', 'producing', 'inactive');
create type call_disposition as enum ('no_answer', 'voicemail', 'not_interested', 'callback', 'appointment_set', 'sold', 'wrong_number');
create type text_status as enum ('pending', 'sent', 'delivered', 'replied', 'opted_out', 'error');
create type activity_type as enum ('dial', 'contact', 'appointment', 'presentation', 'application', 'close');

-- ─────────────────────────────────────────
-- AGENCIES (multi-tenant top level)
-- ─────────────────────────────────────────
create table agencies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  logo_url    text,
  plan        text default 'starter', -- starter | pro | enterprise
  stripe_customer_id text,
  settings    jsonb default '{}',
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  agency_id     uuid references agencies(id) on delete cascade,
  role          user_role default 'rep',
  full_name     text,
  email         text,
  phone         text,
  avatar_url    text,
  manager_id    uuid references profiles(id),
  twilio_number text,              -- assigned DID for this rep
  daily_dial_goal   int default 100,
  daily_close_goal  int default 3,
  active        boolean default true,
  onboarded     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- LEADS (sales pipeline)
-- ─────────────────────────────────────────
create table leads (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  assigned_to     uuid references profiles(id),
  first_name      text not null,
  last_name       text,
  phone           text,
  email           text,
  address         text,
  city            text,
  state           text,
  zip             text,
  date_of_birth   date,
  stage           lead_stage default 'new',
  lead_score      int default 0,        -- 0-100 AI score
  source          text,                 -- facebook, google, referral, etc.
  product_interest text,               -- life, health, auto, etc.
  annual_income   int,
  notes           text,
  tags            text[] default '{}',
  google_sheet_row int,                -- for 2-way sync
  last_contacted  timestamptz,
  next_followup   timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- DAILY ACTIVITIES (workbench tracker)
-- ─────────────────────────────────────────
create table daily_activities (
  id            uuid primary key default uuid_generate_v4(),
  rep_id        uuid references profiles(id) on delete cascade,
  agency_id     uuid references agencies(id) on delete cascade,
  date          date default current_date,
  dials         int default 0,
  contacts      int default 0,
  appointments  int default 0,
  presentations int default 0,
  applications  int default 0,
  closes        int default 0,
  premium       numeric(10,2) default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(rep_id, date)
);

-- ─────────────────────────────────────────
-- CALLS (dialer log)
-- ─────────────────────────────────────────
create table calls (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id),
  rep_id          uuid references profiles(id),
  lead_id         uuid references leads(id),
  twilio_call_sid text unique,
  direction       text default 'outbound',
  from_number     text,
  to_number       text,
  duration_seconds int default 0,
  disposition     call_disposition,
  recording_url   text,
  transcript      text,
  ai_summary      text,              -- GPT-4 call summary
  notes           text,
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- TEXTS (AI texting bot)
-- ─────────────────────────────────────────
create table texts (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id),
  rep_id          uuid references profiles(id),
  lead_id         uuid references leads(id),
  twilio_message_sid text,
  direction       text default 'outbound',   -- outbound | inbound
  from_number     text,
  to_number       text,
  body            text not null,
  status          text_status default 'pending',
  is_ai_generated boolean default true,
  sequence_id     uuid,                      -- which sequence this belongs to
  sequence_step   int,
  sent_at         timestamptz,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- TEXT SEQUENCES (AI bot campaigns)
-- ─────────────────────────────────────────
create table text_sequences (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid references agencies(id),
  name        text not null,
  description text,
  trigger     text,     -- new_lead | no_contact_3d | appointment_reminder | etc.
  active      boolean default true,
  created_at  timestamptz default now()
);

create table text_sequence_steps (
  id              uuid primary key default uuid_generate_v4(),
  sequence_id     uuid references text_sequences(id) on delete cascade,
  step_number     int not null,
  delay_minutes   int default 0,     -- delay after previous step
  message_template text not null,    -- supports {{first_name}}, {{agent_name}} etc.
  ai_personalize  boolean default true,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- RECRUITING PIPELINE
-- ─────────────────────────────────────────
create table recruits (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id) on delete cascade,
  recruited_by    uuid references profiles(id),
  first_name      text not null,
  last_name       text,
  phone           text,
  email           text,
  stage           recruit_stage default 'prospect',
  source          text,
  current_career  text,
  desired_income  int,
  license_state   text,
  license_number  text,
  licensed_date   date,
  notes           text,
  tags            text[] default '{}',
  last_contacted  timestamptz,
  next_followup   timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────
create table appointments (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid references agencies(id),
  rep_id      uuid references profiles(id),
  lead_id     uuid references leads(id),
  title       text,
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  location    text,
  zoom_link   text,
  status      text default 'scheduled',  -- scheduled | completed | no_show | cancelled
  notes       text,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- GOOGLE SHEETS SYNC CONFIG
-- ─────────────────────────────────────────
create table sheet_syncs (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid references agencies(id),
  spreadsheet_id  text not null,
  sheet_name      text default 'Leads',
  sync_direction  text default 'both',  -- import | export | both
  column_mapping  jsonb default '{}',   -- maps sheet columns to lead fields
  last_synced_at  timestamptz,
  active          boolean default true,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table agencies enable row level security;
alter table profiles enable row level security;
alter table leads enable row level security;
alter table daily_activities enable row level security;
alter table calls enable row level security;
alter table texts enable row level security;
alter table recruits enable row level security;
alter table appointments enable row level security;

-- Profiles: users see their own agency
create policy "profiles_agency" on profiles
  for all using (
    agency_id = (select agency_id from profiles where id = auth.uid())
  );

-- Leads: reps see assigned leads, managers see all in agency
create policy "leads_rep_access" on leads
  for all using (
    agency_id = (select agency_id from profiles where id = auth.uid())
    and (
      assigned_to = auth.uid()
      or (select role from profiles where id = auth.uid()) in ('manager', 'admin', 'agency_owner')
    )
  );

-- Daily activities: reps see own, managers see all
create policy "activities_access" on daily_activities
  for all using (
    agency_id = (select agency_id from profiles where id = auth.uid())
    and (
      rep_id = auth.uid()
      or (select role from profiles where id = auth.uid()) in ('manager', 'admin', 'agency_owner')
    )
  );

-- ─────────────────────────────────────────
-- INDEXES (performance)
-- ─────────────────────────────────────────
create index idx_leads_agency on leads(agency_id);
create index idx_leads_assigned on leads(assigned_to);
create index idx_leads_stage on leads(stage);
create index idx_leads_score on leads(lead_score desc);
create index idx_activities_rep_date on daily_activities(rep_id, date desc);
create index idx_calls_lead on calls(lead_id);
create index idx_texts_lead on texts(lead_id);
create index idx_recruits_agency on recruits(agency_id);

-- ─────────────────────────────────────────
-- FUNCTIONS
-- ─────────────────────────────────────────

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at before update on leads
  for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger recruits_updated_at before update on recruits
  for each row execute function update_updated_at();

-- Increment activity counter (called from workbench tap buttons)
create or replace function increment_activity(
  p_rep_id uuid,
  p_agency_id uuid,
  p_field text,
  p_date date default current_date
)
returns daily_activities as $$
declare
  result daily_activities;
begin
  insert into daily_activities (rep_id, agency_id, date)
  values (p_rep_id, p_agency_id, p_date)
  on conflict (rep_id, date) do nothing;

  execute format(
    'update daily_activities set %I = %I + 1, updated_at = now()
     where rep_id = $1 and date = $2
     returning *', p_field, p_field
  ) into result using p_rep_id, p_date;

  return result;
end;
$$ language plpgsql security definer;
