DROP VIEW IF EXISTS wms_vejpunkter CASCADE;

CREATE OR REPLACE VIEW wms_vejpunkter AS
  SELECT
    id,
    formatHusnr(husnr) as husnr,
    objekttype as status,
    vejpunkt_geom as geom
  FROM adgangsadresser_mat;
