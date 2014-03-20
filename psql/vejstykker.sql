
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS vejstykker CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  version VARCHAR(255),
  vejnavn VARCHAR(255) NOT NULL,
  tsv tsvector,
  PRIMARY KEY(kommunekode, kode)
);

CREATE INDEX ON vejstykker USING gin(tsv);
CREATE INDEX ON vejstykker(kode);

-- Init function
DROP FUNCTION IF EXISTS vejstykker_init() CASCADE;
CREATE FUNCTION vejstykker_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    UPDATE vejstykker SET tsv = to_tsvector('adresser', coalesce(vejnavn, ''));
    NULL;
  END;
$$;

-- Trigger which maintains the tsv column
CREATE OR REPLACE FUNCTION vejstykker_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = to_tsvector('adresser', coalesce(NEW.vejnavn, ''));
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER vejstykker_tsv_update BEFORE INSERT OR UPDATE
ON vejstykker FOR EACH ROW EXECUTE PROCEDURE
  vejstykker_tsv_update();