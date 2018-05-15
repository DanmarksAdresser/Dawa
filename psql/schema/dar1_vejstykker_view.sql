DROP VIEW IF EXISTS dar1_vejstykker_view;
CREATE VIEW dar1_vejstykker_view AS
  SELECT
    kommune                           AS kommunekode,
    vejkode                           AS kode,
    COALESCE(vejnavn, '')             AS vejnavn,
    COALESCE(vejadresseringsnavn, '') AS adresseringsnavn,
    navngivenvej_id,
    nvk.id                            AS navngivenvejkommunedel_id
  FROM dar1_navngivenvejkommunedel_current nvk
    JOIN dar1_navngivenvej_current nv
      ON (nv.id = nvk.navngivenvej_id)
  WHERE
    nvk.status IN (2,3);

DROP VIEW IF EXISTS dar1_vejstykker_dirty_view;