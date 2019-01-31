DROP TABLE IF EXISTS vejmidter CASCADE;

CREATE TABLE vejmidter(
  kommunekode smallint,
  kode smallint,
  geom  geometry(MULTILINESTRINGZ, 25832),
  PRIMARY KEY (kommunekode, kode)
);