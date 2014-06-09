DROP TABLE IF EXISTS GriddedDagiTemaer;
CREATE TABLE GriddedDagiTemaer(
  tema dagiTemaType not null,
  kode integer not null,
  geom geometry
);

CREATE INDEX ON GriddedDagiTemaer(tema, kode);
CREATE INDEX ON GriddedDagiTemaer USING GIST(geom);