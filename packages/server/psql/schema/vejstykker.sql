DROP FUNCTION IF EXISTS vejstykker_init() CASCADE;

DROP VIEW IF EXISTS vejstykker_view;
CREATE VIEW vejstykker_view AS
SELECT id                                        as navngivenvejkommunedel_id,
       kommunekode,
       kode,
       oprettet AT TIME ZONE 'Europe/Copenhagen' as oprettet,
       vejnavn,
       adresseringsnavn,
       navngivenvej_id
FROM navngivenvejkommunedel_mat nvk
WHERE nvk.darstatus IN (2, 3);
