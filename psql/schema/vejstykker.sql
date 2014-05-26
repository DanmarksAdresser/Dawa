DROP TABLE IF EXISTS vejstykker CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamptz,
  aendret timestamptz,
  vejnavn VARCHAR(255) NOT NULL,
  adresseringsnavn VARCHAR(255),
  tsv tsvector,
  PRIMARY KEY(kommunekode, kode)
);

CREATE INDEX ON vejstykker USING gin(tsv);
CREATE INDEX ON vejstykker(kode);

DROP TABLE IF EXISTS vejstykker_history CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker_history (
  valid_from integer,
  valid_to integer,
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamptz,
  aendret timestamptz,
  vejnavn VARCHAR(255) NOT NULL,
  adresseringsnavn VARCHAR(255)
);

CREATE INDEX ON vejstykker_history(valid_from);
CREATE INDEX ON vejstykker_history(valid_to);
CREATE INDEX ON vejstykker_history(kommunekode, kode);

-- Init function
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

CREATE TRIGGER vejstykker_tsv_update BEFORE INSERT OR UPDATE
ON vejstykker FOR EACH ROW EXECUTE PROCEDURE
  vejstykker_tsv_update();