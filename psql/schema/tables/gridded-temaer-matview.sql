DROP TABLE IF EXISTS gridded_temaer_matview;
CREATE TABLE gridded_temaer_matview(
  tema tema_type not null,
  id integer not null,
  geom geometry
);

CREATE INDEX ON gridded_temaer_matview(tema, id);
CREATE INDEX ON gridded_temaer_matview USING GIST(geom);