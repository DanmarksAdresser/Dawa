DROP VIEW IF EXISTS wms_adgangsadresser CASCADE;

-- tekstretning konverteres fra GON til grader, og det sikres at vinklen er indenfor +/- 90.
CREATE OR REPLACE VIEW wms_adgangsadresser AS
  SELECT
    id                                                                            AS "AddressAccessIdentifier",
    husnr                                                                         AS "StreetBuildingIdentifier",
    (round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90) % 180 - 90)) :: INTEGER AS "Angle360",
    geom
  FROM adgangsadresser;
