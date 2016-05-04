DROP VIEW IF EXISTS wms_adgangsadresser CASCADE;

-- tekstretning konverteres fra GON til grader, og det sikres at vinklen er indenfor +/- 90.
CREATE OR REPLACE VIEW wms_adgangsadresser AS
  SELECT
    id,
    formatHusnr(husnr) as husnr,
    round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90))::INTEGER % 180 - 90 AS "tekstretninggrader",
    objekttype as status,
    geom
  FROM adgangsadresser;
