DROP VIEW IF EXISTS ikke_brofaste_adresser_view CASCADE;

CREATE VIEW ikke_brofaste_adresser_view AS (
    SELECT adgangsadresse_id, stednavn_id FROM stednavne_adgadr NATURAL JOIN ikke_brofaste_oer
);