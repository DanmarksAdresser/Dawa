DROP VIEW IF EXISTS AdgangsadresserView CASCADE;
CREATE VIEW AdgangsadresserView AS
  SELECT
    A.id as a_id,
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
    A.kilde::smallint,
    A.tekniskstandard,
    A.tekstretning,
    A.kn100mdk,
    A.kn1kmdk,
    A.kn10kmdk,
    A.adressepunktaendringsdato,

    P.nr   AS postnr,
    P.navn AS postnrnavn,

    V.kode    AS vejkode,
    V.vejnavn AS vejnavn,

    A.ejerlavkode,
    EL.navn AS ejerlavnavn,

    K.kode AS kommunekode,
    K.navn AS kommunenavn,
    array_to_json((select array_agg(DISTINCT CAST((D.tema, D.kode, D.navn) AS DagiTemaRef)) FROM AdgangsadresserDagiRel DR JOIN DagiTemaer D  ON (DR.adgangsadresseid = A.id AND D.tema = DR.dagiTema AND D.kode = DR.dagiKode))) AS dagitemaer,
    A.tsv

  FROM adgangsadresser A
    LEFT JOIN ejerlav AS EL ON (A.ejerlavkode = EL.kode)
    LEFT JOIN vejstykker        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
    LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
    LEFT JOIN DagiTemaer AS K ON (K.tema = 'kommune' AND K.kode = A.kommunekode);
