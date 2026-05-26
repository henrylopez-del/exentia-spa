-- Re-add lead_ref (was dropped in migration 02, now needed for GHL custom field enrichment)
ALTER TABLE exentia.bookings ADD COLUMN IF NOT EXISTS lead_ref TEXT;

-- Add attribution jsonb for fbclid/gclid/UTMs from GHL custom fields
ALTER TABLE exentia.bookings ADD COLUMN IF NOT EXISTS atribucion JSONB;

-- Add valor_ticket_mxn for estimated ticket value from GHL
ALTER TABLE exentia.bookings ADD COLUMN IF NOT EXISTS valor_ticket_mxn NUMERIC(10,2);

-- Index on ghl_contact_id for the 2-hour window UPDATE lookup
CREATE INDEX IF NOT EXISTS bookings_ghl_contact_id_idx ON exentia.bookings (ghl_contact_id) WHERE ghl_contact_id IS NOT NULL;
