DROP VIEW IF EXISTS navngivenvejkommunedel_postnr_mat_view CASCADE;
CREATE VIEW navngivenvejkommunedel_postnr_mat_view AS
  (SELECT DISTINCT ON (nvk.id, postnummer_id) nvk.id as navngivenvejkommunedel_id, postnummer_id, hn.id as adgangsadresseid
  FROM dar1_husnummer_current hn
    JOIN dar1_darkommuneinddeling_current k ON hn.darkommune_id = k.id
    JOIN dar1_navngivenvejkommunedel_current nvk ON nvk.navngivenvej_id = hn.navngivenvej_id
    AND k.kommunekode = nvk.kommune
   order by navngivenvejkommunedel_id, postnummer_id, hn.id);