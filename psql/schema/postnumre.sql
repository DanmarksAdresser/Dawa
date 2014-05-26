DROP TABLE IF EXISTS postnumre CASCADE;
CREATE TABLE IF NOT EXISTS postnumre (
  nr integer NOT NULL PRIMARY KEY,
  navn VARCHAR(20) NOT NULL,
  tsv tsvector,
  stormodtager boolean NOT NULL DEFAULT false
);

CREATE INDEX ON postnumre USING gin(tsv);
CREATE INDEX ON postnumre(navn);

DROP TABLE IF EXISTS postnumre_history CASCADE;
CREATE TABLE IF NOT EXISTS postnumre_history (
  valid_from integer,
  valid_to integer,
  nr integer,
  navn VARCHAR(20) NOT NULL,
  stormodtager boolean NOT NULL DEFAULT false
);

-- Init function
DROP FUNCTION IF EXISTS postnumre_init() CASCADE;
CREATE FUNCTION postnumre_init() RETURNS void
LANGUAGE sql AS
$$
    UPDATE postnumre SET tsv = to_tsvector('adresser', coalesce(to_char(nr, '0000'), '') || ' ' || coalesce(navn, ''));
$$;

-- Trigger which maintains the tsv column
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