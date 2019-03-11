DROP VIEW IF EXISTS wms_vejpunkter CASCADE;

CREATE OR REPLACE VIEW wms_vejpunkter AS
  SELECT
    id :: TEXT,
    formatHusnr(husnr)                  AS husnr,
    dar1_status_til_dawa_status(status) AS status,
    vejpunkt_geom                       AS geom
  FROM adgangsadresser_mat
WHERE  status IN (2, 3)
