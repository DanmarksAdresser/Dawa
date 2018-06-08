DROP VIEW IF EXISTS dar1_postnumre_view;
CREATE VIEW dar1_postnumre_view AS (
  SELECT
    postnr AS nr,
    navn,
    FALSE  AS stormodtager
  FROM dar1_postnummer_current
  UNION SELECT DISTINCT
          nr,
          navn,
          TRUE AS stormodtager
        FROM stormodtagere
);