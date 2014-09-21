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
  kommune: kodeAndNavn.concat({
    name: 'regionskode',
    formatter: kode4String,
    selectable: true
  }),
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
  ],
  zone: [
    {
      name: 'zone',
      selectable: true
    }
  ]
};

_.each(fieldMap, function(fields) {
  fieldsUtil.normalize(fields);
});

module.exports = fieldMap;