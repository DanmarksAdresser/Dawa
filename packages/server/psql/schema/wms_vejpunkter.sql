DROP VIEW IF EXISTS wms_vejpunkter CASCADE;

CREATE OR REPLACE VIEW wms_vejpunkter AS
  SELECT
    id :: TEXT,
    formatHusnr(husnr) AS husnr,
    objekttype         AS status,
    vejpunkt_geom      AS geom
  FROM adgangsadresser_mat;
