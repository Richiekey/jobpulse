-- Migration: Add missing ATS platform enums and dual-link + staffing agency columns

-- 1. Helper function to safely add enum values to ats_platform
DO $$
DECLARE
    new_val TEXT;
    new_vals TEXT[] := ARRAY[
        'RIPPLING', 'RECRUITERFLOW', 'GUSTO_ATS', 'MANATAL', 'BREEZY', 
        'CATS', 'BULLHORN', 'PERSONIO', 'PINPOINT', 'KULA', 'GEM', 
        'ORACLE_CLOUD', 'TALEO', 'ADP', 'JOBSCORE', 'TRINET'
    ];
BEGIN
    FOREACH new_val IN ARRAY new_vals
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'ats_platform'::regtype 
            AND enumlabel = new_val
        ) THEN
            EXECUTE format('ALTER TYPE ats_platform ADD VALUE %L', new_val);
        END IF;
    END LOOP;
END $$;

-- 2. Add is_staffing_agency column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_staffing_agency BOOLEAN DEFAULT false;

-- 3. Add apply_url_original and is_staffing_agency columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_url_original TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_staffing_agency BOOLEAN DEFAULT false;

-- 4. Create index on is_staffing_agency for rapid filtering
CREATE INDEX IF NOT EXISTS idx_jobs_is_staffing_agency ON jobs(is_staffing_agency);
CREATE INDEX IF NOT EXISTS idx_companies_is_staffing_agency ON companies(is_staffing_agency);
