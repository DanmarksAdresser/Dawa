DROP VIEW IF EXISTS supplerendebynavn_postnr_mat_view CASCADE;
CREATE VIEW supplerendebynavn_postnr_mat_view AS (
  SELECT DISTINCT
    supplerendebynavn,
    postnr
  FROM adgangsadresser
  WHERE supplerendebynavn IS NOT NULL AND postnr IS NOT NULL);