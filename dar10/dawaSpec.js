"use strict";

/**
 * Specification of DAWA tables and fields, which are updated based on data from DAR 1.0
 */
module.exports = {
  vejstykke: {
    table: 'vejstykker',
    columns: ['kommunekode', 'kode', 'vejnavn', 'adresseringsnavn', 'navngivenvej_id'],
    idColumns: ['kommunekode', 'kode']
  },
  adgangsadresse: {
    table: 'adgangsadresser',
    columns:  ['id', 'kommunekode', 'vejkode', 'husnr', 'supplerendebynavn', 'postnr', 'objekttype',
      'oprettet', 'aendret', 'adgangspunktid', 'etrs89oest', 'etrs89nord', 'noejagtighed',
      'adgangspunktkilde', 'tekniskstandard', 'tekstretning',
      'adressepunktaendringsdato', 'navngivenvej_id'],
    idColumns: ['id']
  },
  adresse: {
    table: 'enhedsadresser',
    columns: ['id', 'objekttype', 'oprettet', 'aendret', 'etage', 'doer', 'adgangsadresseid'],
    idColumns: ['id']
  },
  navngivenvej_postnummer: {
    table: 'navngivenvej_postnummer',
    columns: ['navngivenvej_id', 'postnr', 'tekst'],
    idColumns: ['navngivenvej_id', 'postnr']
  },
  vejstykke_postnummer: {
    table: 'vejstykkerpostnumremat',
    columns: ['kommunekode', 'vejkode', 'postnr', 'tekst'],
    idColumns: ['kommunekode', 'vejkode', 'postnr']
  },
  navngivenvej: {
    table: 'navngivenvej',
    columns: ['id', 'darstatus', 'oprettet',
      'ændret', 'navn', 'adresseringsnavn', 'administreresafkommune',
      'beskrivelse', 'retskrivningskontrol', 'udtaltvejnavn'],
    idColumns: ['id']
  },
  vejpunkt: {
    table: 'vejpunkter',
    columns: ['id', 'husnummerid', 'kilde', 'noejagtighedsklasse', 'tekniskstandard', 'geom'],
    idColumns: ['id']
  }
};
