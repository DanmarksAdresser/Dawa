DROP FUNCTION IF EXISTS postnummer_tsvector(postnumre, stormodtagere) CASCADE;
-- Init function
DROP FUNCTION IF EXISTS adgangsadresser_init_tsv() CASCADE;

DROP FUNCTION IF EXISTS adgangsadresser_init() CASCADE;

DROP FUNCTION IF EXISTS adgangsadresser_refresh_tsv(uuid[]) CASCADE;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update() CASCADE;

-- Triggers which maintains the tsv column when vejstykke changes
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update_on_vejstykke() CASCADE;

-- Triggers which maintains the tsv column when postnummer changes
DROP FUNCTION IF EXISTS adgangsadresser_tsv_update_on_postnummer() CASCADE;

-- Trigger which maintains the geom column
DROP FUNCTION IF EXISTS adgangsadresser_geom_update() CASCADE;
