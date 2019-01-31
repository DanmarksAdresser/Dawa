DROP MATERIALIZED VIEW IF EXISTS wms_vejpunktlinjer;

CREATE MATERIALIZED VIEW wms_vejpunktlinjer AS (
  SELECT
    adgangsadresser_mat.id :: TEXT                                           AS id,
    dar1_status_til_dawa_status(status)                                      AS status,
    st_makeline(adgangsadresser_mat.vejpunkt_geom, adgangsadresser_mat.geom) AS vejpunktlinje
  FROM adgangsadresser_mat
);

CREATE UNIQUE INDEX ON wms_vejpunktlinjer (id);
CREATE INDEX ON wms_vejpunktlinjer USING GIST (vejpunktlinje);
