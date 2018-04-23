DROP VIEW IF EXISTS navngivenvejkommunedel_postnr_mat_view CASCADE;
CREATE VIEW navngivenvejkommunedel_postnr_mat_view AS
  (SELECT DISTINCT ON (navngivenvejkommunedel_id, postnummer_id) navngivenvejkommunedel_id, postnummer_id, id as adgangsadresseid
  FROM adgangsadresser order by navngivenvejkommunedel_id, postnummer_id, id);