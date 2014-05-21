CREATE OR REPLACE FUNCTION processForIndexing(text) RETURNS text AS $$
BEGIN
  RETURN REGEXP_REPLACE($1, '[\\.'']', ' ', 'g');
END;
  $$ language plpgsql;

-- vejstykker

--  Init function
DROP FUNCTION IF EXISTS vejstykker_init() CASCADE;
CREATE FUNCTION vejstykker_init() RETURNS void
LANGUAGE sql AS
  $$
    UPDATE vejstykker SET tsv = to_tsvector('adresser', processForIndexing(coalesce(vejnavn, ''))) WHERE tsv IS DISTINCT FROM to_tsvector('adresser', processForIndexing(coalesce(vejnavn, '')));
$$;

-- Trigger which maintains the tsv column
CREATE OR REPLACE FUNCTION vejstykker_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', processForIndexing(coalesce(NEW.vejnavn, '')));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;
