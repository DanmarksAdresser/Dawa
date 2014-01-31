
\set ON_ERROR_STOP on
\set ECHO queries

CREATE TEMP TABLE IDs AS
SELECT enhedsadresseid, adgangsadresseid, kommunekode, vejkode, postnr
FROM adresser
WHERE postnr = 8600
      AND ST_Contains(ST_GeomFromText('POLYGON((56.19 9.5,  56.20 9.5, 56.20 9.53, 56.19 9.53, 56.19 9.5))',
                                      4326)::geometry,
                      wgs84geom);


CREATE TEMP TABLE enhedsadresser_out AS
SELECT id, version, e.adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer
FROM enhedsadresser e
JOIN IDs ON e.id = IDs.enhedsadresseid;

\copy enhedsadresser_out  TO 'AddressSpecific.csv'  WITH  (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

CREATE TEMP TABLE adgangsadresser_out AS
SELECT id, a.version, bygningsnavn, a.kommunekode, a.vejkode, v.vejnavn, husnr, supplerendebynavn, a.postnr, p.navn AS postnrnavn,
       a.ejerlavkode, e.navn AS ejerlavnavn, matrikelnr, esrejendomsnr, oprettet, ikraftfra, aendret, etrs89oest, etrs89nord,
       wgs84lat, wgs84long, noejagtighed, kilde, tekniskstandard, tekstretning, kn100mdk, kn1kmdk, kn10kmdk, adressepunktaendringsdato
FROM adgangsadresser a
JOIN (SELECT DISTINCT adgangsadresseid from IDs) T ON a.id = T.adgangsadresseid
LEFT JOIN vejnavne v ON v.kode = a.vejkode AND v.kommunekode = a.kommunekode
LEFT JOIN postnumre p ON p.nr = a.postnr
LEFT JOIN ejerlav e ON e.kode = a.ejerlavkode;

\copy adgangsadresser_out TO 'AddressAccess.csv' WITH  (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

CREATE TEMP TABLE postnumre_out AS
SELECT distinct nr, version, navn
FROM postnumre p
JOIN IDs ON p.nr = IDs.postnr;

\copy postnumre_out TO 'PostCode.csv' WITH  (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');

CREATE TEMP TABLE vejnavne_out AS
SELECT DISTINCT v.kommunekode, kode, vejnavn, version
FROM vejnavne v
JOIN IDs ON v.kode = IDs.vejkode AND v.kommunekode = IDs.kommunekode;

\copy vejnavne_out TO 'RoadName.csv' WITH  (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '"');


