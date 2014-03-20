
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS postnumre CASCADE;
CREATE TABLE IF NOT EXISTS postnumre (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL,
  tsv tsvector,
  stormodtager boolean NOT NULL DEFAULT false
);

CREATE INDEX ON postnumre USING gin(tsv);
CREATE INDEX ON postnumre(navn);

-- Init function
DROP FUNCTION IF EXISTS postnumre_init() CASCADE;
CREATE FUNCTION postnumre_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    UPDATE postnumre SET tsv = to_tsvector('adresser', coalesce(to_char(nr, '0000'), '') || ' ' || coalesce(navn, ''));
    NULL;
  END;
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
