"use strict";

var _ = require('underscore');

var sqlUtil = require('../common/sql/sqlUtil');

var selectIsoTimestampUtc = sqlUtil.selectIsoDateUtc;

exports.adgangsadresse = {
  status: {
    column: 'hn_statuskode'
  },
  adgangspunktstatus: {
    column: 'ap_statuskode'
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
  tsv: {
    column: 'tsv'
  }
};

exports.adresse = _.clone(exports.adgangsadresse);

exports.adresse.status = {
  column: 'statuskode'
};
exports.adresse.adgangsadressestatus = {
  column: 'hn_statuskode'
};
exports.adresse.adgangspunktstatus = {
  column: 'ap_statuskode'
};
exports.adresse.dør = {
  column: 'doer'
};
