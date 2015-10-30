"use strict";

var _ = require('underscore');

var sqlUtil = require('../common/sql/sqlUtil');

var selectIsoTimestampUtc = sqlUtil.selectIsoDateUtc;

exports.adgangsadresse = {
  status: {
    column: 'hn_statuskode'
  },
  husnr: {
    select: '(husnr).tal || (husnr).bogstav'
  },
  virkningstart: {
    column: selectIsoTimestampUtc('lower(virkning)')
  },
  virkningslut: {
    column: selectIsoTimestampUtc('upper(virkning)')
  },
  current: {
    select: `(SELECT json_build_object('id', id, 'status', hn_statuskode, 'vejkode',vejkode, 'vejnavn',vejnavn, 'husnr', (husnr).bogstav || (husnr).tal, 'supplerendebynavn', supplerendebynavn, 'postnr', postnr, 'postnrnavn', postnrnavn, 'kommunekode', kommunekode) FROM vask_adgangsadresser a2 WHERE upper(a2.virkning) IS NULL AND vask_adgangsadresser.id = a2.id limit 1)`
  },
  tsv: {
    column: 'tsv'
  }
};

exports.adresse = _.clone(exports.adgangsadresse);
exports.adresse.status = {
  column: 'statuskode'
};
exports.adresse.dør = {
  column: 'doer'
};

exports.adresse.current = {
  select: `(SELECT json_build_object('id', id, 'status', hn_statuskode, 'vejkode',vejkode, 'vejnavn',vejnavn, 'husnr', (husnr).bogstav || (husnr).tal, 'etage', etage, 'dør', doer, 'supplerendebynavn', supplerendebynavn, 'postnr', postnr, 'postnrnavn', postnrnavn, 'kommunekode', kommunekode) FROM vask_adresser a2 WHERE upper(a2.virkning) IS NULL AND vask_adresser.id = a2.id limit 1)`
};
