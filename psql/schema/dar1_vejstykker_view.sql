DROP VIEW IF EXISTS dar1_vejstykker_view;
CREATE VIEW dar1_vejstykker_view AS
  SELECT
    kommune AS kommunekode,
    vejkode AS kode,
    vejnavn,
    COALESCE(vejadresseringsnavn, '') as adresseringsnavn,
    navngivenvej_id
  FROM dar1_navngivenvejkommunedel_current nvk
    JOIN dar1_navngivenvej_current nv
      ON (nv.id = nvk.navngivenvej_id)
  WHERE
    -- vejkode >= 9900 er ikke rigtige veje
    vejkode < 9900
    -- kommunekode >= 900 er grønlandske
    AND kommune < 900;

DROP VIEW IF EXISTS dar1_vejstykker_dirty_view;
CREATE VIEW dar1_vejstykker_dirty_view AS
  SELECT
    kommune as kommunekode,
    vejkode as kode,
    nv.id AS navngivenvej_id,
    nvk.id as navngivenvejkommunedel_id
  FROM dar1_navngivenvejkommunedel_current nvk
    JOIN dar1_navngivenvej_current nv
      ON (nv.id = nvk.navngivenvej_id)
  WHERE
    -- vejkode >= 9900 er ikke rigtige veje
    vejkode < 9900
    -- kommunekode >= 900 er grønlandske
    AND kommune < 900;
