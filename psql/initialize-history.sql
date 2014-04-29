INSERT INTO postnumre_history(
  nr, navn, stormodtager)
SELECT nr, navn, stormodtager FROM postnumre;

INSERT INTO vejstykker_history(
  kommunekode, kode, oprettet, aendret, vejnavn)
SELECT  kommunekode, kode, oprettet, aendret, vejnavn FROM vejstykker;

INSERT INTO adgangsadresser_history(
  id, kommunekode, vejkode, husnr, supplerendebynavn, postnr, ejerlavkode, ejerlavnavn,
  matrikelnr, esrejendomsnr, oprettet, ikraftfra, aendret,
  adgangspunktid, etrs89oest, etrs89nord, wgs84lat, wgs84long, noejagtighed, kilde, placering,
  tekniskstandard, tekstretning, adressepunktaendringsdato, kn100mdk, kn1kmdk, kn10kmdk)
  SELECT id, kommunekode, vejkode, husnr, supplerendebynavn, postnr, ejerlavkode, ejerlavnavn,
  matrikelnr, esrejendomsnr, oprettet, ikraftfra, aendret,
  adgangspunktid, etrs89oest, etrs89nord, wgs84lat, wgs84long, noejagtighed, kilde, placering,
  tekniskstandard, tekstretning, adressepunktaendringsdato, kn100mdk, kn1kmdk, kn10kmdk FROM adgangsadresser;

INSERT INTO enhedsadresser_history(
  id, adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer)
SELECT id, adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer FROM enhedsadresser;
