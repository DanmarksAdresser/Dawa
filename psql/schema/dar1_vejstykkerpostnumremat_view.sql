DROP VIEW IF EXISTS dar1_vejstykkerpostnumremat_view CASCADE;

CREATE VIEW dar1_vejstykkerpostnumremat_view AS
  select distinct ON (kommunekode, vejkode, postnr)
    k.kommunekode,
    nvk.vejkode,
    p.postnr,
    COALESCE(nv.vejnavn, '') || ' ' || to_char(p.postnr, 'FM0000') || ' ' || COALESCE(p.navn, '') as tekst
  from dar1_NavngivenVejKommunedel_current nvk
    JOIN dar1_NavngivenVej_current nv ON nvk.navngivenvej_id = nv.id
    JOIN dar1_darkommuneinddeling_current k ON nvk.kommune = k.kommunekode
    JOIN dar1_Husnummer_current h ON h.navngivenvej_id = nv.id AND h.darkommune_id = k.id
    JOIN dar1_postnummer_current p ON h.postnummer_id = p.id;

DROP VIEW IF EXISTS dar1_vejstykkerpostnumremat_dirty_view;
CREATE VIEW dar1_vejstykkerpostnumremat_dirty_view AS
  select
    nvk.id as navngivenvejkommunedel_id,
    nv.id as navngivenvej_id,
    k.id as darkommuneinddeling_id,
    h.id as husnummer_id,
    p.id as postnummer_id,
    k.kommunekode,
    nvk.vejkode,
    p.postnr
  from dar1_NavngivenVejKommunedel_current nvk
    JOIN dar1_NavngivenVej_current nv ON nvk.navngivenvej_id = nv.id
    JOIN dar1_darkommuneinddeling_current k ON nvk.kommune = k.kommunekode
    JOIN dar1_Husnummer_current h ON h.navngivenvej_id = nv.id AND h.darkommune_id = k.id
    JOIN dar1_postnummer_current p ON h.postnummer_id = p.id;
