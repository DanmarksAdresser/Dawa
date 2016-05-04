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

    A.ejerlavkode,
    EL.navn AS ejerlavnavn,

    A.kommunekode AS kommunekode,
    K.navn AS kommunenavn,
    R.kode AS regionskode,
    R.navn AS regionsnavn,
    array_to_json((select array_agg(CAST((D.tema, D.fields) AS tema_data)) FROM adgangsadresser_temaer_matview DR JOIN temaer D  ON (DR.adgangsadresse_id = A.id AND D.tema = DR.tema AND D.id = DR.tema_id))) AS temaer,
    (SELECT E.navn FROM adgangsadresser_temaer_matview ATM
      JOIN temaer J ON ATM.tema_id = J.id
      JOIN ejerlav E ON (J.fields->>'ejerlavkode')::integer = E.kode WHERE ATM.tema = 'jordstykke' AND ATM.adgangsadresse_id = A.id LIMIT 1) as jordstykke_ejerlavnavn,
    A.tsv

  FROM adgangsadresser A
    LEFT JOIN ejerlav AS EL ON (A.ejerlavkode = EL.kode)
    LEFT JOIN vejstykker        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
    LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
    LEFT JOIN stormodtagere AS S ON (S.adgangsadresseid = A.id)
    LEFT JOIN kommuner K ON A.kommunekode = k.kode
    LEFT JOIN regioner R ON R.kode = K.regionskode
  WHERE postnr IS NOT NULL AND husnr IS NOT NULL AND vejnavn IS NOT NULL and vejnavn <> '';
