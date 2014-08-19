DROP VIEW IF EXISTS wfs_adgangsadresser CASCADE;

CREATE OR REPLACE VIEW wfs_adgangsadresser AS
  SELECT
    a_id::varchar AS id,
    kommunekode,
    vejkode,
    vejnavn,
    husnr,
    supplerendebynavn,
    postnr,
    postnrnavn,
    ejerlavkode,
    ejerlavnavn,
    matrikelnr,
    esrejendomsnr,
    a_oprettet                  AS "oprettet",
    a_ikraftfra                 AS "ikrafttrædelsesdato",
    a_aendret                   AS "ændret",
    oest                AS "etrs89koordinat_øst",
    nord                AS "etrs89koordinat_nord",
    noejagtighed              AS "nøjagtighed",
    kilde,
    tekniskstandard,
    tekstretning,
    kn100mdk                  AS "ddkn_m100",
    kn1kmdk                   AS "ddkn_km1",
    kn10kmdk                  AS "ddkn_km10",
    adressepunktaendringsdato AS "adressepunktændringsdato",
    round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90))::INTEGER % 180 - 90 AS "tekstretninggrader",
    geom
  FROM AdgangsadresserView;
