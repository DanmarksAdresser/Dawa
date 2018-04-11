"use strict";

var _ = require('underscore');

function parseInteger(str) {
  return parseInt(str, 10);
}

// Describes how WFS features map to DAWA model

// we dont include danmark, because we do not need it, and we do not support themes without
// a key for each object (yet)
//exports.danmark = {
//  name: 'danmark',
//  wfsName: 'Danmark',
//  fieldMap: {}
//};

exports.kommune = {
  name: 'kommune',
  geometry: 'geometri',
  wfsName: 'Kommuneinddeling',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    kode: {
      name: 'kommunekode',
      parseFn: parseInteger
    },
    regionskode: {
      name: 'regionskode',
      parseFn: parseInteger
    },
    navn: 'navn'
  },
  filterFn: function(wfsFeature) {
    return wfsFeature.Kommuneinddeling[0].udenforKommuneinddeling[0] === 'false';
  }
};

exports.region = {
  name: 'region',
  wfsName: 'Regionsinddeling',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    kode: {
      name: 'regionskode',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.sogn = {
  name: 'sogn',
  wfsName: 'Sogneinddeling',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    kode: {
      name: 'sognekode',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.opstillingskreds = {
  name: 'opstillingskreds',
  wfsName: 'Opstillingskreds',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    nummer: {
      name: 'opstillingskredsnummer',
      parseFn: parseInteger
    },
    kode: {
      name: 'opstillingskredsnummer',
      parseFn: parseInteger
    },
    valgkredsnummer: {
      name: 'valgkredsnummer',
      parseFn: parseInteger
    },
    storkredsnummer: {
      name: 'storkredsnummer',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.politikreds = {
  name: 'politikreds',
  wfsName: 'Politikreds',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    kode: {
      name: 'myndighedskode',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.retskreds = {
  name: 'retskreds',
  wfsName: 'Retskreds',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    kode: {
      name: 'myndighedskode',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.postnummer = {
  name: 'postdistrikt',
  wfsName: 'Postnummerinddeling',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    nr: {
      name: 'postnummer',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.valglandsdel = {
	name: 'valglandsdel',
	wfsName: 'Valglandsdel',
	geometry: 'geometri',
	fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
		navn: 'navn',
		bogstav: 'valglandsdelsbogstav'
	}
};

exports.storkreds = {
  name: 'storkreds',
  wfsName: 'Storkreds',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    navn: 'navn',
    nummer: {
      name: 'storkredsnummer',
      parseFn: parseInteger
    }
  }
};

exports.afstemningsområde = {
  name: 'afstemningsområde',
  wfsName: 'Afstemningsomraade',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    nummer: {
      name: 'afstemningsomraadenummer',
      parseFn: parseInteger
    },
    afstemningsstednavn: 'afstemningsstedNavn',
    kommunekode: {
      name: 'kommunekode',
      parseFn: parseInteger
    },
    opstillingskreds_dagi_id: {
      name: 'opstillingskredsLokalId',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.menighedsrådsafstemningsområde = {
  name: 'menighedsraadsafstemningsområde',
  wfsName: 'Menighedsraadsafstemningsomraade',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    nummer: {
      name: 'MRafstemningsomraadenummer',
      parseFn: parseInteger
    },
    afstemningsstednavn: 'afstemningsstedNavn',
    kommunekode: {
      name: 'kommunekode',
      parseFn: parseInteger
    },
    sognekode: {
      name: 'sognekode',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.supplerendebynavn = {
  name: 'supplerendebynavn',
  wfsName: 'SupplerendeBynavn',
  geometry: 'geometri',
  dagi_id: {
    name: 'DAGIid',
    parseFn: parseInteger
  },
  navn: 'navn',
  kommunekode: {
    name: 'kommunekode',
    parseFn: parseInteger
  },
};

// normalize, such that every field has a name and a parseFn and a filterFn.
_.each(exports, function(mapping) {
  mapping.fields = _.reduce(mapping.fields, function(memo, value, key) {
    if(_.isObject(value)) {
      memo[key] = value;
    }
    else {
      memo[key] = {
        name: value,
        parseFn: _.identity
      };
    }
    return memo;
  }, {});
  mapping.filterFn = mapping.filterFn || function() { return true; };
});