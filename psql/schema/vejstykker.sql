-- Init function
DROP FUNCTION IF EXISTS vejstykker_init() CASCADE;
CREATE FUNCTION vejstykker_init() RETURNS void
LANGUAGE sql AS
$$
    UPDATE vejstykker SET tsv = to_tsvector('adresser', processForIndexing(coalesce(vejnavn, ''))) WHERE tsv IS DISTINCT FROM to_tsvector('adresser', processForIndexing(coalesce(vejnavn, '')));
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS vejstykker_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION vejstykker_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', processForIndexing(coalesce(NEW.vejnavn, '')));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER vejstykker_tsv_update BEFORE INSERT OR UPDATE
ON vejstykker FOR EACH ROW EXECUTE PROCEDURE
  vejstykker_tsv_update();