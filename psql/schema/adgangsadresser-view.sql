DROP VIEW IF EXISTS AdgangsadresserView CASCADE;
CREATE OR REPLACE VIEW AdgangsadresserView AS
  SELECT
    A.id as a_id,
    A.objekttype as a_objekttype,
    A.husnr,
    A.supplerendebynavn,
    A.oprettet AS a_oprettet,
    A.ikraftfra as a_ikraftfra,
    A.aendret  AS a_aendret,
    A.etrs89oest::double precision AS oest,
    A.etrs89nord::double precision AS nord,
    A.hoejde,
    A.geom       AS geom,
    A.noejagtighed,
    A.adgangspunktkilde AS kilde,
    A.tekniskstandard,
    A.tekstretning,
    '100m_' || (floor(A.etrs89nord / 100))::text || '_' || (floor(etrs89oest / 100))::text as ddkn_m100,
    '1km_' || (floor(A.etrs89nord / 1000))::text || '_' || (floor(etrs89oest / 1000))::text as ddkn_km1,
    '10km_' || (floor(A.etrs89nord / 10000))::text || '_' || (floor(etrs89oest / 10000))::text as ddkn_km10,
    A.adressepunktaendringsdato,

    A.postnr   AS postnr,
    P.navn AS postnrnavn,

    S.nr AS stormodtagerpostnr,
    S.navn AS stormodtagerpostnrnavn,

    A.vejkode    AS vejkode,
    V.vejnavn AS vejnavn,
    V.adresseringsnavn AS adresseringsvejnavn,

    A.kommunekode AS kommunekode,
    K.navn AS kommunenavn,
    R.kode AS regionskode,
    R.navn AS regionsnavn,
    A.ejerlavkode,
    E.navn as ejerlavnavn,
    A.matrikelnr,
    A.esrejendomsnr,
    JA.ejerlavkode as jordstykke_ejerlavkode,
    JA.matrikelnr as jordstykke_matrikelnr,
    JS_E.navn as jordstykke_ejerlavnavn,
    J.esrejendomsnr as jordstykke_esrejendomsnr,
    J.sfeejendomsnr,
    array_to_json((select array_agg(CAST((D.tema, D.fields) AS tema_data)) FROM adgangsadresser_temaer_matview DR
      JOIN temaer D  ON (DR.adgangsadresse_id = A.id AND D.tema = DR.tema AND D.id = DR.tema_id))) AS temaer,
    COALESCE((select json_agg(CAST((b.id, b.kode, b.type, b.navn) AS BebyggelseRef)) FROM bebyggelser_adgadr ba
      JOIN bebyggelser b ON ba.bebyggelse_id = b.id WHERE ba.adgangsadresse_id = A.id),'[]'::json)  as bebyggelser,
    A.tsv

  FROM adgangsadresser A
    LEFT JOIN Ejerlav E ON A.ejerlavkode = E.kode
    LEFT JOIN jordstykker_adgadr JA ON JA.adgangsadresse_id = A.id
    LEFT JOIN jordstykker J ON JA.ejerlavkode = J.ejerlavkode AND JA.matrikelnr = J.matrikelnr
    LEFT JOIN Ejerlav JS_E ON JA.ejerlavkode = JS_E.kode
    LEFT JOIN vejstykker        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
    LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
    LEFT JOIN stormodtagere AS S ON (S.adgangsadresseid = A.id)
    LEFT JOIN kommuner K ON A.kommunekode = k.kode
    LEFT JOIN regioner R ON R.kode = K.regionskode;

CREATE VIEW adgangsadresser_valid_view AS SELECT * from adgangsadresserview WHERE postnr IS NOT NULL AND husnr IS NOT NULL;
