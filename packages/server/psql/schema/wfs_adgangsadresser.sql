DROP VIEW IF EXISTS wfs_adgangsadresser CASCADE;

CREATE OR REPLACE VIEW wfs_adgangsadresser AS
  SELECT
    a_id :: VARCHAR                     AS id,
    dar1_status_til_dawa_status(a_status) AS status,
    kommunekode,
    vejkode,
    vejnavn,
    formatHusnr(husnr)                  AS husnr,
    supplerendebynavn,
    postnr,
    postnrnavn,
    jordstykke_ejerlavkode              AS ejerlavkode,
    jordstykke_ejerlavnavn              AS ejerlavnavn,
    jordstykke_matrikelnr               AS matrikelnr,
    jordstykke_esrejendomsnr            AS esrejendomsnr,
    a_oprettet                          AS "oprettet",
    a_ikraftfra                         AS "ikrafttrædelsesdato",
    a_aendret                           AS "ændret",
    oest                                AS "etrs89koordinat_øst",
    nord                                AS "etrs89koordinat_nord",
    noejagtighed                        AS "nøjagtighed",
    kilde,
    tekniskstandard,
    tekstretning,
    ddkn_m100,
    ddkn_km1,
    ddkn_km10,
    adressepunktaendringsdato           AS "adressepunktændringsdato",
    round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90)) :: INTEGER % 180 -
    90                                  AS "tekstretninggrader",
    vejpunkt_id :: TEXT,
    vejpunkt_kilde,
    vejpunkt_noejagtighedsklasse        AS "vejpunkt_nøjagtighed",
    vejpunkt_tekniskstandard,
    geom
  FROM adgangsadresserview where a_status IN (2,3);
