-- ENUMS
DO $$ BEGIN
    CREATE TYPE employment_type AS ENUM (
        'FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE remote_type AS ENUM (
        'REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'ACTIVE', 'STALE', 'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ats_platform AS ENUM (
        'GREENHOUSE', 'ASHBY', 'LEVER', 'WORKABLE', 'RECRUITEE',
        'TEAMTAILOR', 'SMARTRECRUITERS', 'BAMBOOHR', 'ICIMS', 'JOBDIVA', 'WORKDAY', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    website         TEXT,
    career_url      TEXT,
    ats             ats_platform NOT NULL DEFAULT 'UNKNOWN',
    ats_identifier  TEXT NOT NULL,              -- board token / slug
    country         TEXT,
    active          BOOLEAN NOT NULL DEFAULT true,
    last_checked    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ats, ats_identifier)
);

-- JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source              ats_platform NOT NULL,
    source_job_id       TEXT NOT NULL,
    source_company_id   TEXT,                   -- the ats_identifier of the company
    title               TEXT NOT NULL,
    company_name        TEXT NOT NULL,
    company_url         TEXT,
    location            TEXT,                   -- primary location string
    locations           JSONB DEFAULT '[]',     -- array of {city, region, country}
    country             TEXT,
    city                TEXT,
    remote_type         remote_type DEFAULT 'UNKNOWN',
    employment_type     employment_type,
    department          TEXT,
    team                TEXT,
    description         TEXT,
    requirements        TEXT,
    responsibilities    TEXT,
    salary_min          NUMERIC,
    salary_max          NUMERIC,
    salary_currency     TEXT,
    salary_period       TEXT,                   -- 'YEARLY', 'MONTHLY', 'HOURLY'
    job_url             TEXT,
    apply_url           TEXT,
    posted_at           TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ DEFAULT now(),
    scraped_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    status              job_status NOT NULL DEFAULT 'ACTIVE',
    content_hash        TEXT,                   -- SHA-256 of description
    deduplication_key   TEXT,                   -- hash(company_lower + title_norm + location)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source, source_job_id)
);

-- SOURCE RUNS TABLE (scrape health tracking)
CREATE TABLE IF NOT EXISTS source_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source              ats_platform NOT NULL,
    company_id          UUID REFERENCES companies(id),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'RUNNING',   -- RUNNING, SUCCESS, FAILED
    jobs_found          INTEGER DEFAULT 0,
    jobs_inserted       INTEGER DEFAULT 0,
    jobs_updated        INTEGER DEFAULT 0,
    jobs_skipped        INTEGER DEFAULT 0,
    jobs_failed         INTEGER DEFAULT 0,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IMPORT BATCHES TABLE (bulk URL import tracking)
CREATE TABLE IF NOT EXISTS import_batches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_urls      INTEGER NOT NULL DEFAULT 0,
    successful      INTEGER NOT NULL DEFAULT 0,
    failed          INTEGER NOT NULL DEFAULT 0,
    duplicates      INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'PROCESSING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

-- IMPORT RESULTS TABLE (per-URL results)
CREATE TABLE IF NOT EXISTS import_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    status          TEXT NOT NULL,   -- SUCCESS, FAILED, DUPLICATE, UNSUPPORTED
    job_id          UUID REFERENCES jobs(id),
    error_message   TEXT,
    detected_ats    ats_platform,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company_name ON jobs(company_name);
CREATE INDEX IF NOT EXISTS idx_jobs_remote_type ON jobs(remote_type);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs(salary_min, salary_max) WHERE salary_min IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_dedup_key ON jobs(deduplication_key);
CREATE INDEX IF NOT EXISTS idx_jobs_content_hash ON jobs(content_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_locations ON jobs USING GIN(locations);

-- Full-text search column & index
DO $$ BEGIN
    ALTER TABLE jobs ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(company_name, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'C')
        ) STORED;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_companies_ats ON companies(ats);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_source_runs_source ON source_runs(source);
CREATE INDEX IF NOT EXISTS idx_source_runs_company ON source_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_source_runs_started ON source_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_results_batch ON import_results(batch_id);

-- RLS POLICIES
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read access jobs" ON jobs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read access companies" ON companies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read access source_runs" ON source_runs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read access import_batches" ON import_batches FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read access import_results" ON import_results FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Service access
DO $$ BEGIN
    CREATE POLICY "Service write access jobs" ON jobs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Service write access companies" ON companies FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Service write access source_runs" ON source_runs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Service write access import_batches" ON import_batches FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Service write access import_results" ON import_results FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
