-- Migration: Add data_entry_users table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS data_entry_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- No RLS needed — accessed only via service role key from API routes
