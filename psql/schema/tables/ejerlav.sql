DROP TABLE IF EXISTS ejerlav CASCADE;

CREATE TABLE ejerlav (
  kode INTEGER,
  navn VARCHAR(255) NOT NULL,
  tsv tsvector,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  geom geometry(multipolygon, 25832),
  PRIMARY KEY(kode)
);

CREATE INDEX ejerlav_tsv ON ejerlav USING gin(tsv);
CREATE INDEX ejerlav_navn ON ejerlav(navn);

DROP TABLE IF EXISTS ejerlav_history CASCADE;
