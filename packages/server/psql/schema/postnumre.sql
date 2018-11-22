-- Init function
DROP FUNCTION IF EXISTS postnumre_init() CASCADE;
CREATE FUNCTION postnumre_init() RETURNS void
LANGUAGE sql AS
$$
    UPDATE postnumre SET tsv = to_tsvector('adresser', coalesce(to_char(nr, '0000'), '') || ' ' || coalesce(navn, ''));
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS postnumre_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION postnumre_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', coalesce(to_char(NEW.nr, '0000'), '') || ' ' || coalesce(NEW.navn, ''));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER postnumre_tsv_update BEFORE INSERT OR UPDATE
ON postnumre FOR EACH ROW EXECUTE PROCEDURE
  postnumre_tsv_update();