"use strict";

var _ = require('underscore');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;
var registry = require('../registry');

var kodeAndNavn = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'kode',
      type: 'integer',
      multi: true
    }
  ])
};

var kodeAndNavnTemaer = ['region', 'kommune', 'sogn', 'retskreds', 'politikreds'];
kodeAndNavnTemaer.forEach(function(dagiTemaNavn) {
  module.exports[dagiTemaNavn] = kodeAndNavn;
});

module.exports.opstillingskreds = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'nummer',
      type: 'integer',
      multi: true
    },
    {
      name: 'kode',
      type: 'integer',
      multi: true
    },
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'kredskommunekode',
      type: 'integer',
      multi: true
    },
    {
      name: 'regionskode',
      type: 'integer',
      multi: true
    },
    {
      name: 'storkredsnummer',
      type: 'integer',
      multi: true
    },
    {
      name: 'valglandsdelsbogstav',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer'
    }
  ])
};

module.exports.valglandsdel = {
  id: normalizeParameters([
    {
      name: 'bogstav'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'bogstav',
      multi: true
    }
  ])
};

module.exports.storkreds = {
  id: normalizeParameters([
    {
      name: 'nummer',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'nummer',
      type: 'integer',
      multi: true
    }
  ])
};

module.exports.afstemningsområde = {
  id: normalizeParameters([
    {
      name: 'kommunekode',
      type: 'integer'
    },
    {
      name: 'nummer',
      type: 'integer',
      multi: true
    },
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'dagi_id',
      type: 'integer',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer'
    },
    {
      name: 'opstillingskredsnummer',
      type: 'integer',
      multi: true
    },
    {
      name: 'nummer',
      type: 'integer',
      multi: true
    },
    {
      name: 'navn',
      multi: true
    }
  ])
};

module.exports.menighedsrådsafstemningsområde = {
  id: normalizeParameters([
    {
      name: 'kommunekode',
      type: 'integer'
    },
    {
      name: 'nummer',
      type: 'integer'
    },
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'dagi_id',
      type: 'integer',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      multi: true
    },
    {
      name: 'nummer',
      type: 'integer',
      multi: true
    },
    {
      name: 'sognekode',
      type: 'integer',
      multi: true
    },
    {
      name: 'navn',
      multi: true
    }
  ])
};

module.exports.supplerendebynavn = {
  id: normalizeParameters([
    {
      name: 'dagi_id',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'dagi_id',
      type: 'integer',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer'
    },
    {
      name: 'navn',
      multi: true
    }
  ])
};

_.each(module.exports, function(parameterGroup, temaName) {
  registry.addMultiple(temaName, 'parameterGroup', parameterGroup);
});
