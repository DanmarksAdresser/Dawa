-- Init function
DROP FUNCTION IF EXISTS supplerendebynavne_init() CASCADE;
DROP FUNCTION IF EXISTS supplerendebynavne_init_tsv() CASCADE;
DROP FUNCTION IF EXISTS supplerendebynavne_tsv_update() CASCADE;
DROP FUNCTION IF EXISTS supplerendebynavne_update_on_adgangsadresse() CASCADE;

DROP VIEW IF EXISTS supplerendebynavne_mat_view CASCADE;
CREATE VIEW supplerendebynavne_mat_view AS (
  SELECT DISTINCT
    supplerendebynavn       AS navn
  FROM adgangsadresser
  WHERE supplerendebynavn IS NOT NULL
);

DROP VIEW IF EXISTS supplerendebynavn_kommune_mat_view CASCADE;
CREATE VIEW supplerendebynavn_kommune_mat_view AS (
  SELECT DISTINCT
    supplerendebynavn,
    kommunekode
  FROM adgangsadresser
  WHERE supplerendebynavn IS NOT NULL AND kommunekode IS NOT NULL
);

DROP VIEW IF EXISTS supplerendebynavn_postnr_mat_view CASCADE;
CREATE VIEW supplerendebynavn_postnr_mat_view AS (
  SELECT DISTINCT
    supplerendebynavn,
    postnr
  FROM adgangsadresser
  WHERE supplerendebynavn IS NOT NULL AND postnr IS NOT NULL);