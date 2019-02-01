DROP VIEW IF EXISTS dar1_adgangsadresser_view CASCADE;
DROP VIEW IF EXISTS adgangsadresser_view;
CREATE VIEW adgangsadresser_view AS
  SELECT
    id,
    A.kommunekode,
    vejkode,
    husnr,
    supplerendebynavn,
    postnr,
    dar1_status_til_dawa_status(status) AS objekttype,
    oprettet,
    aendret,
    ikraftfra,
    adgangspunktid,
    vejpunkt_id,
    noejagtighed,
    adgangspunktkilde,
    tekniskstandard,
    tekstretning,
    adressepunktaendringsdato,
    navngivenvej_id,
    navngivenvejkommunedel_id,
    supplerendebynavn_id,
    darkommuneinddeling_id,
    adressepunkt_id,
    postnummer_id,
    supplerendebynavn_dagi_id,
    hoejde,
    etrs89oest,
    etrs89nord,
    JA.ejerlavkode,
    JS_E.navn as ejerlavnavn,
    JA.matrikelnr,
    esrejendomsnr::integer as esrejendomsnr

  FROM adgangsadresser_mat A
    LEFT JOIN jordstykker_adgadr JA ON JA.adgangsadresse_id = A.id
    LEFT JOIN jordstykker J ON JA.ejerlavkode = J.ejerlavkode AND JA.matrikelnr = J.matrikelnr
    LEFT JOIN Ejerlav JS_E ON JA.ejerlavkode = JS_E.kode

  WHERE status IN (2, 3) AND husnr IS NOT NULL;