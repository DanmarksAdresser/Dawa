DROP TABLE IF EXISTS vejstykker CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamp,
  aendret timestamp,
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
CREATE INDEX ON vejstykker_history(kode);