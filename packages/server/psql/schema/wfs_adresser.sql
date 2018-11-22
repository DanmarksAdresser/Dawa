-- This is a temporary fix for WFS induced COUNT queries.
-- We use left join b/c this performs better.
-- However, other DAWA queries perform much worse, so
-- we use two different backing views.
DROP VIEW IF EXISTS adresser_wfs_support CASCADE;

DROP VIEW IF EXISTS wfs_adresser CASCADE;
CREATE OR REPLACE VIEW wfs_adresser AS
  SELECT
    e_id :: VARCHAR                                                             AS "id",
    e_objekttype                                                                AS status,
    etage,
    doer                                                                        AS "dør",
    e_oprettet                                                                  AS "oprettet",
    e_ikraftfra                                                                 AS "ikrafttrædelsesdato",
    e_aendret                                                                   AS "ændret",
    a_id :: VARCHAR                                                             AS "adgangsadresseid",
    kommunekode,
    vejkode,
    vejnavn,
    formatHusnr(husnr)                                                          AS husnr,
    supplerendebynavn,
    postnr,
    postnrnavn,
    jordstykke_ejerlavkode                                                      AS ejerlavkode,
    jordstykke_ejerlavnavn                                                      AS ejerlavnavn,
    jordstykke_matrikelnr                                                       AS matrikelnr,
    jordstykke_esrejendomsnr                                                    AS esrejendomsnr,
    a_oprettet                                                                  AS "adgangsadresse_oprettet",
    a_ikraftfra                                                                 AS "adgangsadresse_ikrafttrædelsesdato",
    a_aendret                                                                   AS "adgangsadresse_ændret",
    a_objekttype                                                                AS adgangsadresse_status,
    oest                                                                        AS "etrs89koordinat_øst",
    nord                                                                        AS "etrs89koordinat_nord",
    noejagtighed                                                                AS "nøjagtighed",
    kilde,
    tekniskstandard,
    tekstretning,
    ddkn_m100,
    ddkn_km1,
    ddkn_km10,
    adressepunktaendringsdato                                                   AS "adressepunktændringsdato",
    round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90)) :: INTEGER % 180 -
    90                                                                          AS "tekstretninggrader",
    vejpunkt_id :: TEXT,
    vejpunkt_kilde,
    vejpunkt_noejagtighedsklasse                                                AS "vejpunkt_nøjagtighed",
    vejpunkt_tekniskstandard,
    geom
  FROM adresser;
