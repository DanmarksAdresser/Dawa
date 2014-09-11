"use strict";

var _ = require('underscore');

var fieldsUtil = require('../common/fieldsUtil');

var kode4String = require('../util').kode4String;

var kodeAndNavn = [
  {
    name: 'kode',
    formatter: kode4String,
    selectable: true
  },
  {
    name: 'navn',
    selectable: true
  }
];

var fieldMap = {
  region: kodeAndNavn,
  kommune: kodeAndNavn,
  sogn: kodeAndNavn,
  politikreds: kodeAndNavn,
  retskreds: kodeAndNavn,
  opstillingskreds: kodeAndNavn,
  postnummer: [
    {
      name: 'nr',
      formatter: kode4String,
      selectable: true
    },
    {
      name: 'navn',
      selectable: true
    }
  ]
};

fieldMap = _.reduce(fieldMap, function (memo, fields, temaNavn) {
  memo[temaNavn] = fields.concat([
    {
      name: 'geom_json',
      selectable: true
    }
  ]);
  return memo;
}, {});

module.exports = _.each(fieldMap, function(fields, temaNavn) {
  fieldsUtil.normalize(fields);
});
