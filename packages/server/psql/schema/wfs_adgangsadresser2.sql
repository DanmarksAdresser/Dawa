DROP VIEW IF EXISTS wfs_adgangsadresser2 CASCADE;

CREATE OR REPLACE VIEW wfs_adgangsadresser2 AS
  SELECT
    a_id :: VARCHAR                                                             AS id,
    a_objekttype                                                                AS status,
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
    a_oprettet                                                                  AS "oprettet",
    a_ikraftfra                                                                 AS "ikrafttraedelsesdato",
    a_aendret                                                                   AS "aendret",
    oest                                                                        AS "etrs89koordinat_oest",
    nord                                                                        AS "etrs89koordinat_nord",
    noejagtighed                                                                AS "noejagtighed",
    kilde,
    tekniskstandard,
    tekstretning,
    ddkn_m100,
    ddkn_km1,
    ddkn_km10,
    adressepunktaendringsdato                                                   AS "adressepunktaendringsdato",
    round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90)) :: INTEGER % 180 -
    90                                                                          AS "tekstretninggrader",
    vejpunkt_id :: TEXT,
    vejpunkt_kilde,
    vejpunkt_noejagtighedsklasse                                                AS "vejpunkt_nøjagtighed",
    vejpunkt_tekniskstandard,
    geom
  FROM Adgangsadresser_valid_view;
