DROP TABLE IF EXISTS bebyggelser_divided;
CREATE TABLE bebyggelser_divided(
  id uuid,
  geom geometry(MultiPolygon, 25832)
);

CREATE INDEX ON bebyggelser_divided(id);
CREATE INDEX ON bebyggelser_divided USING GIST(geom);
