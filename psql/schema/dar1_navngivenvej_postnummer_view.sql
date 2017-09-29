DROP VIEW IF EXISTS dar1_navngivenvej_postnummer_view CASCADE;

CREATE VIEW dar1_navngivenvej_postnummer_view AS
  SELECT
    nv.id                                 AS navngivenvej_id,
    postnr,
    nv.vejnavn || ' ' || postnr || p.navn AS tekst
  FROM dar1_navngivenvejpostnummerrelation_current nvp
    JOIN dar1_navngivenvej_current nv
      ON nv.id = nvp.navngivenvej_id
    JOIN dar1_postnummer_current p ON nvp.postnummer_id = p.id;

DROP VIEW IF EXISTS dar1_navngivenvej_postnummer_dirty_view;
CREATE VIEW dar1_navngivenvej_postnummer_dirty_view AS
  SELECT
    nv.id  AS navngivenvej_id,
    p.id   AS postnummer_id,
    nvp.id AS navngivenvejpostnummerrelation_id,
    p.postnr
  FROM dar1_navngivenvejpostnummerrelation_current nvp
    JOIN dar1_navngivenvej_current nv
      ON nv.id = nvp.navngivenvej_id
    JOIN dar1_postnummer_current p ON nvp.postnummer_id = p.id;
