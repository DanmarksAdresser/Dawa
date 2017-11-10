DROP MATERIALIZED VIEW IF EXISTS stednavn_kommune;
CREATE MATERIALIZED VIEW stednavn_kommune AS
  (SELECT distinct s.id as stednavn_id, k.kode as kommunekode
  FROM stednavne_divided s JOIN gridded_temaer_matview g ON g.tema = 'kommune' AND st_dwithin(s.geom, g.geom, 0)
    JOIN kommuner k ON g.id = k.tema_id);

CREATE UNIQUE INDEX ON stednavn_kommune(stednavn_id, kommunekode);
CREATE  INDEX ON stednavn_kommune(kommunekode);
