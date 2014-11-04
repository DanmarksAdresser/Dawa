-- Init function
DROP FUNCTION IF EXISTS ejerlav_init() CASCADE;
CREATE FUNCTION ejerlav_init() RETURNS void
LANGUAGE sql AS
  $$
    UPDATE ejerlav SET tsv = to_tsvector('adresser', processForIndexing(coalesce(navn, ''))) WHERE tsv IS DISTINCT FROM to_tsvector('adresser', processForIndexing(coalesce(navn, '')));
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS ejerlav_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION ejerlav_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', processForIndexing(coalesce(NEW.navn, '')));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER ejerlav_tsv_update BEFORE INSERT OR UPDATE
ON ejerlav FOR EACH ROW EXECUTE PROCEDURE
  ejerlav_tsv_update();