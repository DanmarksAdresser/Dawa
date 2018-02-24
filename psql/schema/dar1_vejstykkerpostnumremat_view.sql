DROP VIEW IF EXISTS dar1_vejstykkerpostnumremat_view CASCADE;

CREATE VIEW dar1_vejstykkerpostnumremat_view AS
  SELECT
    nv.id                       AS navngivenvej_id,
    nvk.id                      AS navngivenvejkommunedel_id,
    k.id                        AS darkommuneinddeling_id,
    p.id                        AS postnummer_id,
    h.husnummer_id,
    k.kommunekode,
    nvk.vejkode,
    p.postnr,
    COALESCE(nv.vejnavn, '') || ' ' ||
    to_char(p.postnr, 'FM0000') ||
    ' ' || COALESCE(p.navn, '') AS tekst
  FROM dar1_NavngivenVejKommunedel_current nvk
    JOIN dar1_NavngivenVej_current nv ON nvk.navngivenvej_id = nv.id
    JOIN dar1_darkommuneinddeling_current k ON nvk.kommune = k.kommunekode
    JOIN LATERAL (SELECT
                    postnummer_id,
                    min(h.id::text)::uuid as husnummer_id
                  FROM dar1_husnummer_current h
                  WHERE h.navngivenvej_id = nv.id AND h.darkommune_id = k.id
                  GROUP BY postnummer_id) h ON TRUE
    JOIN dar1_postnummer_current p ON p.id = postnummer_id;