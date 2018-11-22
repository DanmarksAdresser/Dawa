-- Init function
DROP FUNCTION IF EXISTS vejstykker_init() CASCADE;
CREATE FUNCTION vejstykker_init() RETURNS void
LANGUAGE sql AS
$$
    UPDATE vejstykker SET tsv = to_tsvector('adresser', processForIndexing(coalesce(vejnavn, ''))) WHERE tsv IS DISTINCT FROM to_tsvector('adresser', processForIndexing(coalesce(vejnavn, '')));
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS vejstykker_tsv_update() CASCADE;
DROP FUNCTION IF EXISTS vejstykker_history_update() CASCADE;
