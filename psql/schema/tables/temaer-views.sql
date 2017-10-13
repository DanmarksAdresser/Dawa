DROP MATERIALIZED VIEW IF EXISTS kommuner CASCADE;
CREATE MATERIALIZED VIEW kommuner AS
  SELECT
    T.id AS tema_id,
    ( T.fields->>'kode')::integer AS kode,
    T.fields->>'navn' AS navn,
    (T.fields->>'regionskode')::integer AS regionskode
  FROM temaer T
  WHERE tema='kommune';

CREATE UNIQUE INDEX ON kommuner(tema_id);
CREATE UNIQUE INDEX ON kommuner(kode);

DROP MATERIALIZED VIEW IF EXISTS regioner CASCADE;
CREATE MATERIALIZED VIEW regioner AS
  SELECT T.id AS tema_id,
    (T.fields->>'kode')::integer AS kode,
    T.fields->>'navn' AS navn
  FROM temaer T
  WHERE tema='region';

CREATE UNIQUE INDEX ON regioner(tema_id);
CREATE UNIQUE INDEX ON regioner(kode);
