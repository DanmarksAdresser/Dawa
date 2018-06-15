DROP TABLE IF EXISTS ejerlav CASCADE;

CREATE TABLE ejerlav (
  kode          INTEGER,
  navn          VARCHAR(255) NOT NULL,
  tsv           TSVECTOR,
  ændret        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  geo_version   INTEGER      NOT NULL DEFAULT 1,
  geo_ændret    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  geom          GEOMETRY(multipolygon, 25832),
  bbox          GEOMETRY(Polygon, 25832),
  visueltcenter GEOMETRY(Point, 25832),
  PRIMARY KEY (kode)
);

CREATE INDEX ejerlav_tsv
  ON ejerlav USING GIN (tsv);
CREATE INDEX ejerlav_navn
  ON ejerlav (navn);

DROP TABLE IF EXISTS ejerlav_history CASCADE;
