-- Init function
DROP FUNCTION IF EXISTS dagitemaer_init() CASCADE;
CREATE FUNCTION dagitemaer_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    UPDATE dagitemaer SET tsv = to_tsvector('adresser', coalesce(navn, ''));
  END;
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS dagitemaer_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION dagitemaer_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', coalesce(NEW.navn, ''));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER dagitemaer_tsv_update BEFORE INSERT OR UPDATE
ON dagitemaer FOR EACH ROW EXECUTE PROCEDURE
  dagitemaer_tsv_update();