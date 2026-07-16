-- QC Apps — Supabase Postgres schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor > New query).
-- Re-running is safe: all tables use IF NOT EXISTS.
--
-- ⚠ RLS NOTE: Tables below are created WITHOUT RLS enabled.
-- This is acceptable for the internal prototype with the anon key.
-- Before production: enable RLS on every table and add auth policies.

-- ── hubs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hubs (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  location  TEXT NOT NULL
);

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  email   TEXT NOT NULL UNIQUE,
  role    TEXT NOT NULL CHECK (role IN ('officer','spv','px')),
  hub_id  TEXT REFERENCES hubs(id)
);

-- ── stock (mock WIMS) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock (
  sku_id        TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  product_id    TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('Fresh','Frozen','Dry')),
  sloc          TEXT,
  soh           INTEGER NOT NULL DEFAULT 0,
  msltc         INTEGER NOT NULL DEFAULT 0,
  last_ed       DATE,
  stock_status  TEXT NOT NULL DEFAULT 'Available' CHECK (stock_status IN ('Available','Bad'))
);

-- ── master_leveling ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_leveling (
  sku_id        TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  product_id    TEXT NOT NULL,
  category      TEXT NOT NULL,
  risk_score    INTEGER NOT NULL DEFAULT 0,
  priority      TEXT NOT NULL DEFAULT 'Low' CHECK (priority IN ('Low','Medium','High')),
  level         TEXT NOT NULL DEFAULT 'LV1' CHECK (level IN ('LV1','LV2','LV3')),
  coverage_pct  INTEGER NOT NULL DEFAULT 20,
  manual_flag   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    TEXT NOT NULL
);

-- ── leveling_changelog ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leveling_changelog (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id  TEXT REFERENCES master_leveling(sku_id),
  field   TEXT NOT NULL,
  old     TEXT,
  new     TEXT,
  actor   TEXT NOT NULL,
  ts      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── priority_list ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS priority_list (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week          TEXT NOT NULL,
  sku_id        TEXT REFERENCES master_leveling(sku_id),
  params_met    INTEGER NOT NULL DEFAULT 0,
  risk_score    INTEGER NOT NULL DEFAULT 0,
  priority      TEXT NOT NULL,
  level         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Done')),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── tasks ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id        TEXT REFERENCES master_leveling(sku_id),
  hub_id        TEXT REFERENCES hubs(id),
  officer_id    TEXT REFERENCES users(id),
  priority      TEXT NOT NULL CHECK (priority IN ('Low','Medium','High')),
  level         TEXT NOT NULL CHECK (level IN ('LV1','LV2','LV3')),
  coverage_pct  INTEGER NOT NULL,
  deadline      TIMESTAMPTZ NOT NULL,
  instructions  TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Done','Overdue')),
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── inspections ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID REFERENCES tasks(id),
  sku_id              TEXT REFERENCES master_leveling(sku_id),
  officer_id          TEXT REFERENCES users(id),
  hub_id              TEXT REFERENCES hubs(id),
  soh                 INTEGER NOT NULL,
  sampling_qty        INTEGER NOT NULL,
  product_temp        NUMERIC,
  prod_date           DATE,
  exp_date            DATE,
  qty_good            INTEGER NOT NULL DEFAULT 0,
  qty_bad             INTEGER NOT NULL DEFAULT 0,
  total_defect        INTEGER NOT NULL DEFAULT 0,
  defect_reasons      TEXT[] NOT NULL DEFAULT '{}',
  defect_desc         TEXT NOT NULL DEFAULT '',
  nc_pct              NUMERIC NOT NULL DEFAULT 0,
  decision            TEXT NOT NULL,
  recommended_action  TEXT NOT NULL DEFAULT '',
  proposed_status     TEXT CHECK (proposed_status IN ('Available','Bad')),
  lifecycle_state     TEXT NOT NULL DEFAULT 'SUBMITTED',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── inspection_photos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  is_defect     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── status_changes ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_changes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id  UUID REFERENCES inspections(id),
  sku_id         TEXT REFERENCES master_leveling(sku_id),
  hub_id         TEXT REFERENCES hubs(id),
  old_status     TEXT NOT NULL,
  new_status     TEXT NOT NULL,
  state          TEXT NOT NULL DEFAULT 'Pending' CHECK (state IN ('Pending','Approved','Rejected')),
  reason         TEXT,
  source         TEXT NOT NULL CHECK (source IN ('inspection','verification')),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by     TEXT REFERENCES users(id),
  decided_at     TIMESTAMPTZ
);

-- ── verifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id  UUID REFERENCES inspections(id),
  spv_id         TEXT REFERENCES users(id),
  officer_id     TEXT REFERENCES users(id),
  qty_checked    INTEGER NOT NULL,
  sample_qty     INTEGER NOT NULL,
  good_qty       INTEGER NOT NULL,
  match_flag     BOOLEAN NOT NULL,
  severity       TEXT,
  defect_type    TEXT,
  defect_qty     INTEGER,
  wastage_reason TEXT,
  compliance_pct NUMERIC NOT NULL,
  band           TEXT NOT NULL CHECK (band IN ('PASSED','PASSED_WITH_NOTE','NOT_PASSED')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── audit_log (append-only) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  action     TEXT NOT NULL,
  payload    JSONB,
  actor      TEXT NOT NULL,
  ts         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── config (editable thresholds) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

INSERT INTO config (key, value) VALUES
  ('accepted_max_pct', '5'),
  ('conditional_max_pct', '20'),
  ('verif_sample_pct', '20'),
  ('coverage_lv1', '20'),
  ('coverage_lv2', '50'),
  ('coverage_lv3', '70')
ON CONFLICT (key) DO NOTHING;

-- ── schema migrations (run after initial schema) ────────────────────────────
-- master_leveling: add sku_number + 4 risk params
ALTER TABLE master_leveling ADD COLUMN IF NOT EXISTS sku_number TEXT;
ALTER TABLE master_leveling ADD COLUMN IF NOT EXISTS param_wastage  INTEGER;
ALTER TABLE master_leveling ADD COLUMN IF NOT EXISTS param_inbound  INTEGER;
ALTER TABLE master_leveling ADD COLUMN IF NOT EXISTS param_topsku   INTEGER;
ALTER TABLE master_leveling ADD COLUMN IF NOT EXISTS param_complaint INTEGER;

-- priority_list: add 4 risk params + unique week/sku constraint
ALTER TABLE priority_list ADD COLUMN IF NOT EXISTS param_wastage   INTEGER;
ALTER TABLE priority_list ADD COLUMN IF NOT EXISTS param_inbound   INTEGER;
ALTER TABLE priority_list ADD COLUMN IF NOT EXISTS param_topsku    INTEGER;
ALTER TABLE priority_list ADD COLUMN IF NOT EXISTS param_complaint INTEGER;
ALTER TABLE priority_list DROP CONSTRAINT IF EXISTS priority_list_week_sku_key;
ALTER TABLE priority_list ADD CONSTRAINT priority_list_week_sku_key UNIQUE (week, sku_id);

-- tasks: add source + assigned_at; make officer_id nullable if not already
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','generated','bulk'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE tasks ALTER COLUMN officer_id DROP NOT NULL;

-- ── wms_inventory ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wms_inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week         TEXT NOT NULL,
  hub_id       TEXT REFERENCES hubs(id),
  product_id   TEXT NOT NULL,
  sku_id       TEXT NOT NULL,
  soh_available INTEGER NOT NULL DEFAULT 0,
  sloc         TEXT,
  expiry_date  DATE,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop FK constraints that block bulk-loading from Superset exports
-- (master_leveling and priority_list may contain SKUs not yet in stock)
ALTER TABLE master_leveling DROP CONSTRAINT IF EXISTS master_leveling_sku_id_fkey;
ALTER TABLE priority_list   DROP CONSTRAINT IF EXISTS priority_list_sku_id_fkey;

-- Storage bucket: run in Supabase Dashboard > Storage > New bucket
-- Name: inspection-photos  |  Public: true (prototype only)
