DROP MATERIALIZED VIEW IF EXISTS sted_kommune;
CREATE MATERIALIZED VIEW sted_kommune AS
  (SELECT distinct s.id as stedid, k.kode as kommunekode
  FROM steder_divided s JOIN kommuner_divided k ON  st_dwithin(s.geom, k.geom, 0));

CREATE UNIQUE INDEX ON sted_kommune(stedid, kommunekode);
CREATE  INDEX ON sted_kommune(kommunekode);
