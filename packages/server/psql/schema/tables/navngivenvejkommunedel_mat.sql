DROP TABLE IF EXISTS navngivenvejkommunedel_mat CASCADE;
CREATE TABLE IF NOT EXISTS navngivenvejkommunedel_mat (
  id uuid PRIMARY KEY,
  darstatus smallint,
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamp,
  nedlagt timestamp,
  vejnavn VARCHAR(255) NOT NULL,
  adresseringsnavn VARCHAR(255),
  tsv tsvector,
  geom  geometry(MULTILINESTRINGZ, 25832),
  navngivenvej_id uuid
);

CREATE UNIQUE INDEX ON navngivenvejkommunedel_mat(kommunekode, kode);
CREATE INDEX ON navngivenvejkommunedel_mat USING gin(tsv);
CREATE INDEX ON navngivenvejkommunedel_mat(kode);
CREATE INDEX ON navngivenvejkommunedel_mat(vejnavn);
CREATE INDEX ON navngivenvejkommunedel_mat USING GIST(vejnavn gist_trgm_ops);
CREATE INDEX ON navngivenvejkommunedel_mat USING GIST(geom);
CREATE INDEX ON navngivenvejkommunedel_mat(navngivenvej_id);