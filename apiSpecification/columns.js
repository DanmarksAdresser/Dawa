"use strict";

/*
 * This file specifices how each field in fields.js maps to columns in the base queries specified in baseQueries.js .
 * 'select' specifies what the field is called in the select part of the base query. 'where' specifies the name in the
 * WHERE clause of the base query. 'where' is optional, defaults to the same as select.
 *
 * Not all fields is specified, by default the column name is the same as the field name for both select and where.
 */

var dagiTemaer = require('./dagiTemaer');

exports.adgangsadresse = {
  id: {
    column: 'a_id'
  },
  etrs89koordinat_øst: {
    column: 'oest'
  },
  etrs89koordinat_nord: {
    column: 'nord'
  },
  wgs84koordinat_bredde: {
    column: 'lat'
  },
  wgs84koordinat_længde: {
    column: 'long'
  },
  nøjagtighed: {
    column: 'noejagtighed'
  },
  DDKN_m100: {
    column: 'kn100mdk'
  },
  DDKN_km1: {
    column: 'kn1kmdk'
  },
  DDKN_km10: {
    column: 'kn10kmdk'
  },
  dagitemaer: {
    multi: true
  },
  tsv: {
    select: null,
    where: 'tsv'
  }
};

exports.adresse = {
  id: {
    column: 'e_id'
  },
  adgangsadresseid: {
    column: 'a_id'
  },
  dør: {
    column: 'doer'
  },
  etrs89koordinat_øst: {
    column: 'oest'
  },
  etrs89koordinat_nord: {
    column: 'nord'
  },
  wgs84koordinat_bredde: {
    column: 'lat'
  },
  wgs84koordinat_længde: {
    column: 'long'
  },
  nøjagtighed: {
    column: 'noejagtighed'
  },
  DDKN_m100: {
    column: 'kn100mdk'
  },
  DDKN_km1: {
    column: 'kn1kmdk'
  },
  DDKN_km10: {
    column: 'kn10kmdk'
  },
  dagitemaer: {
    multi: true
  },
  tsv: {
    select: null,
    where: 'e_tsv'
  }
};

exports.supplerendebynavn = {
  navn: {
    column: 'supplerendebynavn'
  },
  kommunekode: {
    select: null,
    where: 'supplerendebynavne.kommunekode'
  },
  postnr: {
    select: null,
    where: 'supplerendebynavne.postnr'
  },
  kommuner: {
    multi: true
  },
  postnumre: {
    multi: true
  },
  tsv: {
    select: null,
    where: 'supplerendebynavne.tsv'
  }
};

exports.vejnavn = {
  navn: {
    select: 'navn',
    where:'vejstykker.vejnavn'
  },
  postnr: {
    select: null,
    where: 'vp1.postnr'
  },
  kommunekode: {
    select: 'kommunekode',
    where: 'vejstykker.kommunekode'
  },
  kommuner: {
    multi: true
  },
  postnumre: {
    multi: true
  },
  tsv: {
    select: null,
    where: 'vejstykker.tsv'
  }
};

exports.vejstykke = {
  kode: {
    select: 'kode',
    where: 'vejstykker.kode'
  },
  kommunekode: {
    select: 'kommunekode',
    where: 'vejstykker.kommunekode'
  },
  navn: {
    column: 'vejnavn'
  },
  postnr: {
    select: null,
    where: 'vp2.postnr'
  },
  kommuner: {
    multi: true
  },
  postnumre: {
    multi: true
  },
  tsv: {
    select: null,
    where: 'vejstykker.tsv'
  }
};

exports.postnummer = {
  nr: {
    select: 'nr',
    where: 'm.postnr'
  },
  navn: {
    select: 'navn',
    column: 'p.navn'
  },
  version: {
    select: 'version',
    where: 'p.version'
  },
  kommune: {
    select: null,
    where: 'n.kommunekode'
  },
  kommuner: {
    multi: true
  },
  tsv: {
    select: null,
    where: 'p.tsv'
  }
};

// no column mappings necessary for dagi temaer.
dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {};
});
