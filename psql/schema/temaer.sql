-- Init function
DROP FUNCTION IF EXISTS temaer_init() CASCADE;
CREATE FUNCTION temaer_init() RETURNS void
LANGUAGE sql AS
$$
UPDATE temaer SET tsv = to_tsvector('adresser',coalesce(temaer.fields->>'kode', '') || ' ' || coalesce(temaer.fields->>'navn')) WHERE temaer.tema <> 'jordstykke';
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS temaer_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION temaer_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', coalesce(NEW.fields->>'kode', '') || ' ' || coalesce(NEW.fields->>'navn', ''));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER temaer_tsv_update BEFORE INSERT OR UPDATE
ON temaer FOR EACH ROW EXECUTE PROCEDURE
  temaer_tsv_update();