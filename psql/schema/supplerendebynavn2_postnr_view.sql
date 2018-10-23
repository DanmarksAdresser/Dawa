DROP VIEW IF EXISTS supplerendebynavn2_postnr_view CASCADE;

CREATE VIEW supplerendebynavn2_postnr_view AS
  (select distinct supplerendebynavn_dagi_id, postnr postnr
  FROM adgangsadresser_mat
  WHERE supplerendebynavn_dagi_id IS NOT NULL);