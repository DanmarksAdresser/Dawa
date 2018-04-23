DROP VIEW IF EXISTS jordstykker_adgadr_view CASCADE;
CREATE VIEW jordstykker_adgadr_view AS (
  (SELECT DISTINCT ON (adgangsadresse_id) j.ejerlavkode, j.matrikelnr, a.id as adgangsadresse_id FROM adgangsadresser_mat a
    JOIN jordstykker j ON ST_Covers(j.geom, a.geom)));