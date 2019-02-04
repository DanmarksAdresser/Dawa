DROP VIEW IF EXISTS supplerendebynavne_mat_view CASCADE;
CREATE VIEW supplerendebynavne_mat_view AS (
  SELECT DISTINCT navn
  FROM dar1_supplerendebynavn_current
  WHERE navn IS NOT NULL
);

