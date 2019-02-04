DROP VIEW IF EXISTS dar1_vejstykkerpostnumremat_view CASCADE;
DROP VIEW IF EXISTS vejstykkerpostnumremat_view CASCADE;

CREATE VIEW vejstykkerpostnumremat_view AS
  SELECT
    navngivenvejkommunedel_id,
    postnummer_id,
    nv.id                       AS navngivenvej_id,
    k.id                        AS darkommuneinddeling_id,
    k.kommunekode,
    nvk.vejkode,
    p.postnr,
    COALESCE(nv.vejnavn, '') || ' ' ||
    to_char(p.postnr, 'FM0000') ||
    ' ' || COALESCE(p.navn, '') AS tekst
  FROM
    navngivenvejkommunedel_postnr_mat np
    JOIN dar1_NavngivenVejKommunedel_current nvk ON np.navngivenvejkommunedel_id = nvk.id
    JOIN dar1_NavngivenVej_current nv ON nvk.navngivenvej_id = nv.id
    JOIN dar1_darkommuneinddeling_current k ON nvk.kommune = k.kommunekode
    JOIN dar1_postnummer_current p ON p.id = postnummer_id;