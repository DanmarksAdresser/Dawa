"use strict";

const fieldsUtil = require('../common/fieldsUtil');
const temaModels = require('../../dagiImport/temaModels');
const sqlModels = require('./sqlModels');
const { kode4String, numberToString } = require('../util');

const additionalFieldsMap = {
  kommune: [
    {
      name: 'dagi_id',
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
      name: 'udenforkommuneinddeling'
    },
    {
      name: 'regionsnavn'
    }
  ],
  afstemningsområde: [
    {
      name: 'dagi_id',
      formatter: numberToString
    },
    {
      name: 'nummer',
      formatter: numberToString
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
      name: 'afstemningssted_adgangspunkt_x'
    },
    {
      name: 'afstemningssted_adgangspunkt_y'
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
      name: 'dagi_id',
      formatter: numberToString
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
      name: 'dagi_id',
      formatter: numberToString
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
      name: 'dagi_id',
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
      name: 'postnumre',
      multi: true
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
    },
    {
      name: 'bbox_xmin'
    },
    {
      name: 'bbox_ymin'
    },
    {
      name: 'bbox_xmax'
    },
    {
      name: 'bbox_ymax'
    },
    {
      name: 'visueltcenter_x'
    },
    {
      name: 'visueltcenter_y'
    }]);
  fieldsUtil.applySelectability(result, sqlModels[model.singular]);
  memo[model.singular] = result;
  return memo;
}, {});

module.exports = fieldMap;