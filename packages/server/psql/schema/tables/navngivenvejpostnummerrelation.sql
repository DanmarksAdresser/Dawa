DROP TABLE IF EXISTS navngivenvejpostnummerrelation CASCADE;
CREATE TABLE navngivenvejpostnummerrelation(
  navngivenvej_id uuid not null,
  postnr smallint not null,
  geom    geometry(Geometry, 25832),
  primary key(navngivenvej_id, postnr)
);

CREATE INDEX ON navngivenvejpostnummerrelation(postnr);