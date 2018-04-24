DROP VIEW IF EXISTS dar1_navngivenvej_postnummer_view CASCADE;

CREATE VIEW dar1_navngivenvej_postnummer_view AS
  SELECT distinct on (nvp.navngivenvej_id, nvp.postnummer_id)
    nvp.id,
    nv.id                                 AS navngivenvej_id,
    nvp.postnummer_id,
    postnr,
    coalesce(nv.vejnavn, '') || ' ' || postnr || p.navn AS tekst
  FROM dar1_navngivenvejpostnummerrelation_current nvp
    JOIN dar1_navngivenvej_current nv
      ON nv.id = nvp.navngivenvej_id
    JOIN dar1_postnummer_current p ON nvp.postnummer_id = p.id
  WHERE nvp.status IN (2,3);