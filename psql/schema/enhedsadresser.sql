-- Init function
DROP FUNCTION IF EXISTS enhedsadresser_init() CASCADE;
-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS enhedsadresser_tsv_update() CASCADE;

-- Triggers which maintains the tsv column when adgangs changes
DROP FUNCTION IF EXISTS enhedsadresser_tsv_update_on_adgangsadresse() CASCADE;
