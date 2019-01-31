DROP TABLE IF EXISTS vejstykker CASCADE;
CREATE TABLE IF NOT EXISTS vejstykker (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  oprettet timestamp,
  aendret timestamp,
  vejnavn VARCHAR(255) NOT NULL,
  adresseringsnavn VARCHAR(255),
  navngivenvej_id uuid,
  navngivenvejkommunedel_id uuid,
  PRIMARY KEY(kommunekode, kode)
);