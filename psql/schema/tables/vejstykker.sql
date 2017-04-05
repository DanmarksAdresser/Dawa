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
