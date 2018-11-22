DROP VIEW IF EXISTS wms_housenumber_inspire CASCADE;

-- tekstretning konverteres fra GON til grader, og det sikres at vinklen er indenfor +/- 90.
CREATE OR REPLACE VIEW wms_housenumber_inspire AS
  SELECT
    id :: TEXT                                                                   AS "AddressAccessIdentifier",
    formatHusnr(
        husnr)                                                                  AS "StreetBuildingIdentifier",
    round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90)) :: INTEGER % 180 - 90 AS "Angle360",
    geom
  FROM adgangsadresser_mat;
