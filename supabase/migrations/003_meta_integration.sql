-- ============================================================
-- META / FACEBOOK INTEGRATION SCHEMA
-- ============================================================

-- ─────────────────────────────────────────
-- META COLUMNS ON LEADS
-- Track exactly where every lead came from
-- ─────────────────────────────────────────
alter table leads
  add column if not exists meta_lead_id       text unique,     -- Facebook lead gen ID
  add column if not exists meta_form_id       text,            -- Lead form ID
  add column if not exists meta_campaign_id   text,            -- Campaign ID
  add column if not exists meta_campaign_name text,            -- Campaign name (human readable)
  add column if not exists meta_adset_id      text,            -- Ad set ID
  add column if not exists meta_adset_name    text,
  add column if not exists meta_ad_id         text,            -- Individual ad ID
  add column if not exists meta_ad_name       text,
  add column if not exists meta_page_id       text,            -- FB Page the ad ran on
  add column if not exists fbclid             text,            -- Click ID for pixel matching
  add column if not exists raw_meta_payload   jsonb;           -- Full Facebook payload stored

create index if not exists idx_leads_meta_campaign on leads(meta_campaign_id);
create index if not exists idx_leads_meta_form     on leads(meta_form_id);
create index if not exists idx_leads_meta_lead_id  on leads(meta_lead_id);


-- ─────────────────────────────────────────
-- META APP CONFIGS (per agency)
-- ─────────────────────────────────────────
create table if not exists meta_configs (
  id                uuid primary key default uuid_generate_v4(),
  agency_id         uuid references agencies(id) on delete cascade,
  page_id           text not null,             -- Facebook Page ID
  page_name         text,
  app_id            text,
  access_token      text not null,             -- Page access token (long-lived)
  pixel_id          text,                      -- Meta Pixel ID for CAPI
  capi_access_token text,                      -- Separate token for Conversions API
  verify_token      text not null              -- Random string for webhook verification
    default md5(random()::text),
  active            boolean default true,
  created_at        timestamptz default now()
);

alter table meta_configs enable row level security;
create policy "meta_configs_agency" on meta_configs
  for all using (agency_id = (select agency_id from profiles where id = auth.uid()));


-- ─────────────────────────────────────────
-- LEAD ROUTING RULES
-- Map campaign/adset/form → rep (or round-robin pool)
-- ─────────────────────────────────────────
create type routing_strategy as enum ('direct', 'round_robin', 'least_loaded', 'cap_based');

create table if not exists routing_rules (
  id                uuid primary key default uuid_generate_v4(),
  agency_id         uuid references agencies(id) on delete cascade,
  name              text not null,
  priority          int default 0,             -- Higher = checked first
  active            boolean default true,

  -- Match criteria (null = match any)
  meta_form_id      text,
  meta_campaign_id  text,
  meta_adset_id     text,
  page_id           text,
  source            text,                      -- e.g. 'facebook', 'google', 'manual'

  -- Routing config
  strategy          routing_strategy default 'round_robin',
  rep_ids           uuid[],                    -- Pool of reps for round_robin / least_loaded
  direct_rep_id     uuid references profiles(id),  -- For 'direct' strategy
  daily_cap         int,                       -- Max leads per rep per day (cap_based)

  -- Auto-actions on match
  auto_sequence_id  uuid references text_sequences(id),  -- Fire this sequence immediately
  lead_stage        text default 'new',
  lead_tags         text[] default '{}',

  -- Stats
  leads_routed      int default 0,
  last_routed_at    timestamptz,
  created_at        timestamptz default now()
);

alter table routing_rules enable row level security;
create policy "routing_rules_agency" on routing_rules
  for all using (agency_id = (select agency_id from profiles where id = auth.uid()));

-- Round-robin state: track which rep is next
create table if not exists routing_state (
  rule_id       uuid primary key references routing_rules(id) on delete cascade,
  next_rep_index int default 0,
  updated_at    timestamptz default now()
);


-- ─────────────────────────────────────────
-- META CONVERSION EVENTS LOG
-- Every event we send back to Facebook
-- ─────────────────────────────────────────
create table if not exists meta_events (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid references agencies(id),
  lead_id       uuid references leads(id),
  event_name    text not null,    -- Lead, Schedule, Purchase, etc.
  event_time    timestamptz default now(),
  event_id      text,             -- Dedup ID we generate
  pixel_id      text,
  value         numeric(10,2),    -- For Purchase events (policy premium)
  currency      text default 'USD',
  sent          boolean default false,
  meta_response jsonb,
  error         text,
  created_at    timestamptz default now()
);

create index idx_meta_events_lead on meta_events(lead_id);
create index idx_meta_events_sent on meta_events(sent, created_at);


-- ─────────────────────────────────────────
-- CAMPAIGN PERFORMANCE VIEW
-- Easy analytics per campaign
-- ─────────────────────────────────────────
create or replace view campaign_performance as
select
  l.agency_id,
  l.meta_campaign_id,
  l.meta_campaign_name,
  l.meta_adset_id,
  l.meta_adset_name,
  l.meta_form_id,
  count(*)                                          as total_leads,
  count(*) filter (where l.stage = 'issued')        as issued,
  count(*) filter (where l.stage = 'appointment')   as appointments,
  count(*) filter (where l.stage = 'applied')       as applied,
  round(count(*) filter (where l.stage = 'issued')::numeric
        / nullif(count(*), 0) * 100, 1)             as close_rate_pct,
  min(l.created_at)                                 as first_lead_at,
  max(l.created_at)                                 as last_lead_at
from leads l
where l.meta_campaign_id is not null
group by l.agency_id, l.meta_campaign_id, l.meta_campaign_name,
         l.meta_adset_id, l.meta_adset_name, l.meta_form_id;
