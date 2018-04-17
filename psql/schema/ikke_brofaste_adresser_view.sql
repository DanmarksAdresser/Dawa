DROP VIEW IF EXISTS ikke_brofaste_adresser_view CASCADE;

CREATE VIEW ikke_brofaste_adresser_view AS (
    SELECT adgangsadresseid, st.stedid FROM stedtilknytninger st JOIN brofasthed b ON st.stedid = b.stedid AND NOT b.brofast
);