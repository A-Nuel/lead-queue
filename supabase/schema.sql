-- ============================================================
-- Lead Research Pipeline — Supabase Schema
-- Run this in Supabase SQL Editor once.
-- ============================================================

-- Each batch run (a set of queries you fire off together)
create table if not exists search_batches (
  id uuid primary key default gen_random_uuid(),
  label text,                               -- e.g. "Week 1 - UK/UAE sweep"
  queries_planned int,
  queries_used int default 0,
  status text default 'pending',            -- 'pending' | 'running' | 'done' | 'failed'
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- Businesses discovered via SerpAPI Google Maps search
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  place_id text unique not null,           -- Google's stable ID, used for dedupe
  name text not null,
  category text,                            -- e.g. "plumber", "hair salon"
  country text not null,
  city text not null,
  address text,
  phone_raw text,                           -- as returned by SerpAPI
  phone_e164 text,                          -- normalized, e.g. +447911123456
  whatsapp_link text,                       -- wa.me/<phone_e164 digits only>
  website text,                             -- null/empty = no website (strong signal)
  website_status text,                      -- 'none' | 'broken' | 'weak' | 'ok' | 'unchecked'
  rating numeric,
  reviews_count int,
  running_ads boolean default false,        -- from Meta Ad Library check
  ads_checked boolean default false,
  detected_need text,                       -- human-readable pitch angle
  score int default 0,                      -- 0-100, higher = better prospect
  status text default 'new',                -- 'new' | 'contacted' | 'replied' | 'won' | 'dead' | 'skip'
  notes text,
  search_batch_id uuid references search_batches(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tracks SerpAPI usage against your monthly quota
create table if not exists search_log (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references search_batches(id),
  query_country text,
  query_city text,
  query_category text,
  results_returned int,
  results_new int,                          -- after dedupe
  created_at timestamptz default now()
);

-- Saved city/category combos you rotate through each batch
create table if not exists target_queries (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  city text not null,
  category text not null,
  active boolean default true,
  last_run_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_country on leads(country);
create index if not exists idx_leads_score on leads(score desc);
create index if not exists idx_leads_created on leads(created_at desc);

-- Simple monthly quota view (250/month default, adjust as needed)
create or replace view monthly_quota as
select
  date_trunc('month', now()) as month,
  250 as quota,
  coalesce(sum(1), 0) as used,
  250 - coalesce(sum(1), 0) as remaining
from search_log
where created_at >= date_trunc('month', now());
