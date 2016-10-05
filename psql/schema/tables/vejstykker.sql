DROP TABLE IF EXISTS vejstykker CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamp,
  aendret timestamp,
  vejnavn VARCHAR(255) NOT NULL,
  adresseringsnavn VARCHAR(255),
  tsv tsvector,
  geom  geometry(MULTILINESTRINGZ, 25832),
  navngivenvej_id uuid,
  PRIMARY KEY(kommunekode, kode)
);

CREATE INDEX ON vejstykker USING gin(tsv);
CREATE INDEX ON vejstykker(kode);
CREATE INDEX ON vejstykker(vejnavn);
CREATE INDEX ON vejstykker USING GIST(vejnavn gist_trgm_ops);
CREATE INDEX ON vejstykker USING GIST(geom);
CREATE INDEX ON vejstykker(navngivenvej_id);

DROP TABLE IF EXISTS vejstykker_history CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker_history (
  valid_from integer,
  valid_to integer,
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamp,
  aendret timestamp,
  vejnavn VARCHAR(255) NOT NULL,
  adresseringsnavn VARCHAR(255),
  navngivenvej_id uuid
);

CREATE INDEX ON vejstykker_history(valid_from);
CREATE INDEX ON vejstykker_history(valid_to);
CREATE INDEX ON vejstykker_history(kommunekode, kode);
CREATE INDEX ON vejstykker_history(kode);
