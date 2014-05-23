"use strict";

// this file provides a mapping from our database field names to BBR field names.
// Only fields where the names differs are included.

module.exports = {
  postnummer: {
    nr: 'nummer'
  },
  adresse: {
    ikraftfra: 'ikrafttraedelsesdato'
  },
  vejstykke: {
    kode: 'vejkode',
    vejnavn: 'navn'
  },
  adgangsadresse: {
    husnr: 'husnummer',
    ejerlavkode: 'landsejerlav_kode',
    ejerlavnavn: 'landsejerlav_navn',
    postnr: 'postnummer',
    ikraftfra: 'ikrafttraedelsesdato',
    adgangspunktid: 'adgangspunkt_id',
    kilde: 'adgangspunkt_kilde',
    noejagtighed: 'adgangspunkt_noejagtighedsklasse',
    tekniskstandard: 'adgangspunkt_tekniskstandard',
    tekstretning: 'adgangspunkt_retning',
    placering: 'adgangspunkt_placering',
    adressepunktaendringsdato: 'adgangspunkt_revisionsdato',
    etrs89oest: 'adgangspunkt_etrs89koordinat_oest',
    etrs89nord: 'adgangspunkt_etrs89koordinat_nord',
    wgs84long: 'adgangspunkt_wgs84koordinat_laengde',
    wgs84lat: 'adgangspunkt_wgs84koordinat_bredde',
    kn100mdk: 'adgangspunkt_DDKN_m100',
    kn1kmdk: 'adgangspunkt_DDKN_km1',
    kn10kmdk: 'adgangspunkt_DDKN_km10'
  }
};