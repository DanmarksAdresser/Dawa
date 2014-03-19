
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS DagiTemaer CASCADE;
CREATE TABLE DagiTemaer (
  tema DagiTemaType not null,
  kode integer not null,
  navn varchar(255),
  geom  geometry(MultiPolygon, 25832),
  tsv tsvector,
  PRIMARY KEY(tema, kode)
);

CREATE INDEX ON DagiTemaer USING gist(geom);
CREATE INDEX ON DagiTemaer(navn);

-- Init function
DROP FUNCTION IF EXISTS dagitemaer_init() CASCADE;
CREATE FUNCTION dagitemaer_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    NULL;
  END;
$$;
