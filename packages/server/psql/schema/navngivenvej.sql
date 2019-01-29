DROP VIEW IF EXISTS dar1_navngivenvej_view CASCADE;

DROP VIEW IF EXISTS navngivenvej_view CASCADE;

CREATE VIEW navngivenvej_view AS (
  SELECT * FROM navngivenvej_mat WHERE darstatus IN (2,3)
);