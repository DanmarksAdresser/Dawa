DROP VIEW IF EXISTS supplerendebynavn_kommune_mat_view CASCADE;
CREATE VIEW supplerendebynavn_kommune_mat_view AS (
  SELECT DISTINCT
    supplerendebynavn,
    kommunekode
  FROM adgangsadresser
  WHERE supplerendebynavn IS NOT NULL AND kommunekode IS NOT NULL
);

