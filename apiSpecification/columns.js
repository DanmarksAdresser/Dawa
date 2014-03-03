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
    select: 'a_id'
  },
  etrs89koordinat_øst: {
    select: 'oest'
  },
  etrs89koordinat_nord: {
    select: 'nord'
  },
  wgs84koordinat_bredde: {
    select: 'lat'
  },
  wgs84koordinat_længde: {
    select: 'long'
  },
  nøjagtighed: {
    select: 'noejagtighed'
  },
  DDKN_m100: {
    select: 'kn100mdk'
  },
  DDKN_km1: {
    select: 'kn1kmdk'
  },
  DDKN_km10: {
    select: 'kn10kmdk'
  }
};

exports.adresse = {
  id: {
    select: 'e_id'
  },
  adgangsadresseid: {
    select: 'a_id'
  },
  dør: {
    select: 'doer'
  },
  etrs89koordinat_øst: {
    select: 'oest'
  },
  etrs89koordinat_nord: {
    select: 'nord'
  },
  wgs84koordinat_bredde: {
    select: 'lat'
  },
  wgs84koordinat_længde: {
    select: 'long'
  },
  nøjagtighed: {
    select: 'noejagtighed'
  },
  DDKN_m100: {
    select: 'kn100mdk'
  },
  DDKN_km1: {
    select: 'kn1kmdk'
  },
  DDKN_km10: {
    select: 'kn10kmdk'
  },
  tsv: {
    select: 'e_tsv'
  }
};

exports.supplerendebynavn = {
  navn: {
    select: 'supplerendebynavn'
  },
  kommunekode: {
    select: 'supplerendebynavne.kommunekode'
  },
  postnr: {
    select: 'supplerendebynavne.postnr'
  },
  tsv: {
    select: 'supplerendebynavne.tsv'
  }
};

exports.vejnavn = {
  navn: {
    select: 'navn',
    where:'vejstykker.vejnavn'
  },
  postnr: {
    select: 'vp1.postnr'
  },
  kommunekode: {
    select: 'vejstykker.kommunekode'
  },
  tsv: {
    select: 'vejstykker.tsv'
  }
};

exports.vejstykke = {
  kode: {
    select: 'vejstykker.kode'
  },
  kommunekode: {
    select: 'vejstykker.kommunekode'
  },
  navn: {
    select: 'vejnavn'
  },
  postnr: {
    select: 'vp2.postnr'
  },
  tsv: {
    select: 'vejstykker.tsv'
  }
};

exports.postnummer = {
  nr: {
    select: 'nr',
    where: 'm.postnr'
  },
  navn: {
    select: 'p.navn'
  },
  version: {
    select: 'p.version'
  },
  kommune: {
    select: 'n.kommunekode'
  },
  tsv: {
    select: 'p.tsv'
  }
};

// no column mappings necessary for DAGI temaer
dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {};
});
