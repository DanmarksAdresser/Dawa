CREATE TEMP TABLE IDs AS
SELECT e_id, a_id, kommunekode, vejkode, postnr
FROM adresser
WHERE ST_Contains(ST_Transform(ST_GeomFromText('POLYGON((9.4 55.3, 12.7 55.6, 12.7 55.601, 9.4 55.301, 9.4 55.3))',
                                      4326), 25832),
                      geom);

CREATE TEMP TABLE enhedsadresser_out AS
SELECT id, e.adgangsadresseid, etage, doer, 1 as objekttype, oprettet, aendret, ikraftfra as ikrafttraedelsesdato
FROM enhedsadresser e
JOIN IDs ON e.id = IDs.e_id;

\copy enhedsadresser_out  TO 'Enhedsadresse.CSV'  WITH  (ENCODING 'iso-8859-1',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

CREATE TEMP TABLE adgangsadresser_out AS
SELECT id, a.vejkode, husnr as husnummer, a.kommunekode,
  ejerlavkode as landsejerlav_kode, ejerlavnavn AS landsejerlav_navn, matrikelnr, esrejendomsnr,
  a.postnr as postnummer, p.navn AS postdistrikt, supplerendebynavn,
  1 as objekttype, oprettet, aendret, ikraftfra as ikrafttraedelsesdato,
  adgangspunktid as adgangspunkt_id, kilde as adgangspunkt_kilde, noejagtighed as adgangspunkt_noejagtighedsklasse,
  tekniskstandard as adgangspunkt_tekniskstandard, tekstretning as adgangspunkt_retning,
  placering as adgangspunkt_placering, adressepunktaendringsdato as adgangspunkt_revisionsdato,
  etrs89oest as adgangspunkt_etrs89koordinat_oest, etrs89nord as adgangspunkt_etrs89koordinat_nord,
  wgs84lat as adgangspunkt_wgs84koordinat_bredde, wgs84long as adgangspunkt_wgs84koordinat_laengde,
  kn100mdk as adgangspunkt_DDKN_m100, kn1kmdk as adgangspunkt_DDKN_km1, kn10kmdk as adgangspunkt_DDKN_km10
FROM adgangsadresser a
JOIN (select distinct a_id from IDs) as ids ON (a.id = a_id)
LEFT JOIN postnumre p ON p.nr = a.postnr;

\copy adgangsadresser_out TO 'Adgangsadresse.CSV' WITH  (ENCODING 'iso-8859-1',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

CREATE TEMP TABLE postnumre_out AS
SELECT nr, navn
FROM postnumre p
    JOIN (select distinct postnr from Ids) as IDs ON p.nr = IDs.postnr;

\copy postnumre_out TO 'Postnummer.CSV' WITH  (ENCODING 'iso-8859-1',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

CREATE TEMP TABLE vejnavne_out AS
SELECT v.kommunekode, kode, vejnavn as navn, adresseringsnavn
FROM vejstykker v
    JOIN (select distinct kommunekode, vejkode from IDs) as IDs ON v.kode = IDs.vejkode AND v.kommunekode = IDs.kommunekode;

\copy vejnavne_out TO 'Vejnavn.CSV' WITH  (ENCODING 'iso-8859-1',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');


