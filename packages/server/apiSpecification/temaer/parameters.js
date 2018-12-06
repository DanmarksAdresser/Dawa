"use strict";

var _ = require('underscore');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;
var registry = require('../registry');
const parameterSchema = require('../parameterSchema');

var kodeAndNavn = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer',
      schema: parameterSchema.kode4
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
      multi: true,
      schema: parameterSchema.kode4
    }
  ])
};

var kodeAndNavnTemaer = ['region', 'kommune', 'sogn', 'retskreds', 'politikreds'];
kodeAndNavnTemaer.forEach(function(dagiTemaNavn) {
  module.exports[dagiTemaNavn] = kodeAndNavn;
});

module.exports.kommune = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer',
      schema: parameterSchema.kode4
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
      multi: true,
      schema: parameterSchema.kode4

    },
    {
      name: 'regionskode',
      type: 'integer',
      multi: true,
      schema: parameterSchema.kode4
    },
    {
      name: 'udenforkommuneinddeling',
      type: 'boolean'
    }
  ])
};

module.exports.landpostnummer = {
  id: normalizeParameters([
    {
      name: 'nr',
      type: 'integer',
      schema: parameterSchema.kode4
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'nr',
      type: 'integer',
      multi: true,
      schema: parameterSchema.kode4
    }
  ])
};


module.exports.opstillingskreds = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer',
      schema: parameterSchema.kode4
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'dagi_id',
      type: 'integer',
      multi: true
    },
    {
      name: 'nummer',
      type: 'integer',
      multi: true
    },
    {
      name: 'kode',
      type: 'integer',
      multi: true,
      schema: parameterSchema.kode4
    },
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'kredskommunekode',
      type: 'integer',
      multi: true,
      schema: parameterSchema.kode4
    },
    {
      name: 'regionskode',
      type: 'integer',
      multi: true,
      schema: parameterSchema.kode4
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
      type: 'integer',
      schema: parameterSchema.kode4
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
    },
    {
      name: 'valglandsdelsbogstav',
      multi: true
    },
    {
      name: 'regionskode',
      type: 'integer',
      multi: true,
      schema: parameterSchema.kode4
    }
  ])
};

module.exports.afstemningsområde = {
  id: normalizeParameters([
    {
      name: 'kommunekode',
      type: 'integer',
      schema: parameterSchema.kode4
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
      type: 'integer',
      schema: parameterSchema.kode4
    },
    {
      name: 'regionskode',
      type: 'integer',
      multi: true,
      schema: parameterSchema.kode4
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
      type: 'integer',
      schema: parameterSchema.kode4
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
      multi: true,
      schema: parameterSchema.kode4
    },
    {
      name: 'nummer',
      type: 'integer',
      multi: true
    },
    {
      name: 'sognekode',
      type: 'integer',
      multi: true,
      schema: parameterSchema.kode4
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
      type: 'integer',
      schema: parameterSchema.kode4
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
