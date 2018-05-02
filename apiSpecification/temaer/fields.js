"use strict";

const fieldsUtil = require('../common/fieldsUtil');
const temaModels = require('../../dagiImport/temaModels');
const sqlModels = require('./sqlModels');
const { kode4String, numberToString } = require('../util');

const additionalFieldsMap = {
  afstemningsområde: [
    {
      name: 'dagi_id'
    },
    {
      name: 'nummer'
    },
    {
      name: 'navn'
    },
    {
      name: 'afstemningsstednavn'
    },
    {
      name: 'afstemningsstedadresseid'
    },
    {
      name: 'afstemningsstedadressebetegnelse'
    },
    {
      name: 'kommunekode',
      formatter: kode4String
    },
    {
      name: 'kommunenavn'
    },
    {
      name: 'regionskode',
      formatter: kode4String
    },
    {
      name: 'regionsnavn'
    },
    {
      name: 'opstillingskredsnummer',
      formatter: numberToString
    },
    {
      name: 'opstillingskredsnavn'
    },
    {
      name: 'storkredsnummer',
      formatter: numberToString
    },
    {
      name: 'storkredsnavn'
    },
    {
      name: 'valglandsdelsbogstav'
    },
    {
      name: 'valglandsdelsnavn'
    }
  ],
  menighedsrådsafstemningsområde: [
    {
      name: 'dagi_id'
    },
    {
      name: 'nummer',
      formatter: numberToString
    },
    {
      name: 'navn'
    },
    {
      name: 'kommunekode',
      formatter: kode4String
    },
    {
      name: 'kommunenavn'
    },
    {
      name: 'sognekode',
      formatter: kode4String
    },
    {
      name: 'sognenavn'
    }
  ],
  opstillingskreds: [
    {
      name: 'dagi_id'
    },
    {
      name: 'nummer',
      formatter: numberToString
    },
    {
      name: 'kode',
      formatter: kode4String
    },
    {
      name: 'navn'
    },
    {
      name: 'regionskode',
      formatter: kode4String
    },
    {
      name: 'regionsnavn'
    },
    {
      name: 'kredskommunekode',
      formatter: kode4String
    },
    {
      name: 'kredskommunenavn'
    },
    {
      name: 'kommuner',
      multi: true
    },
    {
      name: 'storkredsnummer',
      formatter: numberToString
    },
    {
      name: 'storkredsnavn'
    },
    {
      name: 'valglandsdelsbogstav'
    },
    {
      name: 'valglandsdelsnavn'
    }
  ],
  storkreds: [
    {
      name: 'nummer',
      formatter: numberToString
    },
    {
      name: 'navn'
    },
    {
      name: 'regionskode',
      formatter: kode4String
    },
    {
      name: 'regionsnavn'
    },
    {
      name: 'valglandsdelsbogstav'
    },
    {
      name: 'valglandsdelsnavn'
    }
  ],
  supplerendebynavn: [
    {
      name: 'dagi_id'
    },
    {
      name: 'navn'
    },
    {
      name: 'kommunekode',
      formatter: kode4String
    },
    {
      name: 'kommunenavn'
    }
  ]
};

const fieldMap = temaModels.modelList.filter(model => model.published).reduce((memo, model) => {
  const result = fieldsUtil.normalize([
    ...(additionalFieldsMap[model.singular] || model.fields),
    {
      name: 'ændret',
      selectable: true
    },
    {
      name: 'geo_ændret',
      selectable: true
    },
    {
      name: 'geo_version',
      selectable: true
    },
    {
      name: 'geom_json',
      selectable: true
    }]);
  fieldsUtil.applySelectability(result, sqlModels[model.singular]);
  memo[model.singular] = result;
  return memo;
}, {});

module.exports = fieldMap;