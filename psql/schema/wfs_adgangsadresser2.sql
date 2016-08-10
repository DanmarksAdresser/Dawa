DROP VIEW IF EXISTS wfs_adgangsadresser2 CASCADE;

CREATE OR REPLACE VIEW wfs_adgangsadresser2 AS
  SELECT
    a_id::varchar AS id,
    a_objekttype AS status,
    kommunekode,
    vejkode,
    vejnavn,
    formatHusnr(husnr) as husnr,
    supplerendebynavn,
    postnr,
    postnrnavn,
    ejerlavkode,
    ejerlavnavn,
    matrikelnr,
    esrejendomsnr,
    a_oprettet                  AS "oprettet",
    a_ikraftfra                 AS "ikrafttraedelsesdato",
    a_aendret                   AS "aendret",
    oest                AS "etrs89koordinat_oest",
    nord                AS "etrs89koordinat_nord",
    noejagtighed              AS "noejagtighed",
    kilde,
    tekniskstandard,
    tekstretning,
    ddkn_m100,
    ddkn_km1,
    ddkn_km10,
    adressepunktaendringsdato AS "adressepunktaendringsdato",
    round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90))::INTEGER % 180 - 90 AS "tekstretninggrader",
    geom
  FROM Adgangsadresser_valid_view;
