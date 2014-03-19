
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS vejstykker CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  version VARCHAR(255) NOT NULL,
  vejnavn VARCHAR(255) NOT NULL,
  tsv tsvector,
  PRIMARY KEY(kommunekode, kode)
);

CREATE INDEX ON vejstykker USING gin(tsv);
CREATE INDEX ON vejstykker(kode);

