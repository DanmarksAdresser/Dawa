DROP TABLE IF EXISTS steder_divided CASCADE;
CREATE TABLE steder_divided(
  id uuid,
  geom geometry(geometry, 25832)
);

CREATE INDEX ON steder_divided(id);
CREATE INDEX ON steder_divided USING GIST(geom);
