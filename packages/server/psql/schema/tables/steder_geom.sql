DROP TABLE IF EXISTS steder_geom;
CREATE TABLE steder_geom(
  id uuid primary key,
  geom geometry(geometry, 25832),
  geom_blobref text
);

