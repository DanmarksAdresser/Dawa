"use strict";

const fieldsUtil = require('../common/fieldsUtil');
const temaModels = require('../../dagiImport/temaModels');
const sqlModels = require('./sqlModels');

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
      name: 'kommunekode'
    },
    {
      name: 'kommunenavn'
    },
    {
      name: 'regionskode'
    },
    {
      name: 'regionsnavn'
    },
    {
      name: 'opstillingskredsnummer'
    },
    {
      name: 'opstillingskredsnavn'
    },
    {
      name: 'storkredsnummer'
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
      name: 'nummer'
    },
    {
      name: 'navn'
    },
    {
      name: 'kommunekode'
    },
    {
      name: 'kommunenavn'
    },
    {
      name: 'sognekode'
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
      name: 'nummer'
    },
    {
      name: 'kode'
    },
    {
      name: 'navn'
    },
    {
      name: 'regionskode'
    },
    {
      name: 'regionsnavn'
    },
    {
      name: 'kredskommunekode'
    },
    {
      name: 'kredskommunenavn'
    },
    {
      name: 'kommuner',
      multi: true
    },
    {
      name: 'storkredsnummer'
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
      name: 'nummer'
    },
    {
      name: 'navn'
    },
    {
      name: 'regionskode'
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