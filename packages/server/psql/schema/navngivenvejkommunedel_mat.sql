DROP VIEW IF EXISTS navngivenvejkommunedel_mat_view;
CREATE VIEW navngivenvejkommunedel_mat_view AS
  SELECT
    nvk.id,
    kommune                           AS kommunekode,
    vejkode                           AS kode,
    COALESCE(vejnavn, '')             AS vejnavn,
    COALESCE(vejadresseringsnavn, '') AS adresseringsnavn,
    navngivenvej_id,
    nvk.status                                                                        AS darstatus,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_navngivenvejkommunedel_history nh
     WHERE nh.id = nvk.id)                                                            AS oprettet,
    (SELECT min(lower(virkning) AT TIME ZONE 'Europe/Copenhagen')
     FROM dar1_navngivenvejkommunedel_history nh
     WHERE nh.id = nvk.id AND status IN (4, 5))                                       AS nedlagt,
    geom

  FROM dar1_navngivenvejkommunedel_current nvk
    JOIN dar1_navngivenvej_current nv
      ON (nv.id = nvk.navngivenvej_id)
     LEFT JOIN vejmidter vm on nvk.kommune = vm.kommunekode AND nvk.vejkode = vm.kode;
