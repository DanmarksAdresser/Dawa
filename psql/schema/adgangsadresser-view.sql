DROP VIEW IF EXISTS AdgangsadresserView CASCADE;
CREATE VIEW AdgangsadresserView AS
  SELECT
    A.id as a_id,
    A.objekttype as a_objekttype,
    A.husnr,
    A.supplerendebynavn,
    A.matrikelnr,
    A.esrejendomsnr,
    A.oprettet AS a_oprettet,
    A.ikraftfra as a_ikraftfra,
    A.aendret  AS a_aendret,
    A.etrs89oest::double precision AS oest,
    A.etrs89nord::double precision AS nord,
    A.geom       AS geom,
    A.noejagtighed,
    A.adgangspunktkilde AS kilde,
    A.tekniskstandard,
    A.tekstretning,
    '100m_' || (floor(A.etrs89nord / 100))::text || '_' || (floor(etrs89oest / 100))::text as ddkn_m100,
    '1km_' || (floor(A.etrs89nord / 1000))::text || '_' || (floor(etrs89oest / 1000))::text as ddkn_km1,
    '10km_' || (floor(A.etrs89nord / 10000))::text || '_' || (floor(etrs89oest / 10000))::text as ddkn_km10,
    A.adressepunktaendringsdato,

    P.nr   AS postnr,
    P.navn AS postnrnavn,

    V.kode    AS vejkode,
    V.vejnavn AS vejnavn,
    V.adresseringsnavn AS adresseringsvejnavn,

    A.ejerlavkode,
    EL.navn AS ejerlavnavn,

    cast(K.fields->>'kode' as integer) AS kommunekode,
    K.fields->>'navn' AS kommunenavn,
    cast(R.fields->>'kode' as integer) AS regionskode,
    R.fields->>'navn' AS regionsnavn,
    array_to_json((select array_agg(CAST((D.tema, D.fields) AS tema_data)) FROM adgangsadresser_temaer_matview DR JOIN temaer D  ON (DR.adgangsadresse_id = A.id AND D.tema = DR.tema AND D.id = DR.tema_id))) AS temaer,
    A.tsv

  FROM adgangsadresser A
    LEFT JOIN ejerlav AS EL ON (A.ejerlavkode = EL.kode)
    LEFT JOIN vejstykker        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
    LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
    LEFT JOIN temaer AS K ON (K.tema = 'kommune' AND cast(K.fields->>'kode' as integer) = A.kommunekode)
    LEFT JOIN temaer AS R ON (K.fields->>'regionskode') = (R.fields->>'kode') and R.tema = 'region'
  WHERE postnr IS NOT NULL AND husnr IS NOT NULL;
