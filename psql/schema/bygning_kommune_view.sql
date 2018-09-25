DROP VIEW IF EXISTS bygning_kommune_view CASCADE;
CREATE VIEW bygning_kommune_view AS (
  SELECT DISTINCT
    bygninger.id   AS bygningid,
    kommuner.kode AS kommunekode
  FROM bygninger JOIN kommuner_divided kommuner ON ST_Intersects(bygninger.geom, kommuner.geom));