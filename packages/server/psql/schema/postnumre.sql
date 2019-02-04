-- Init function
DROP FUNCTION IF EXISTS postnumre_init() CASCADE;
DROP FUNCTION IF EXISTS postnumre_tsv_update() CASCADE;

DROP VIEW IF EXISTS dar1_postnumre_view;
DROP VIEW IF EXISTS postnumre_view;
CREATE VIEW postnumre_view AS (
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