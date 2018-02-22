DROP MATERIALIZED VIEW IF EXISTS stednavn_kommune;
CREATE MATERIALIZED VIEW stednavn_kommune AS
  (SELECT distinct s.id as stednavn_id, k.kode as kommunekode
  FROM stednavne_divided s JOIN kommuner_divided k ON  st_dwithin(s.geom, k.geom, 0));

CREATE UNIQUE INDEX ON stednavn_kommune(stednavn_id, kommunekode);
CREATE  INDEX ON stednavn_kommune(kommunekode);
