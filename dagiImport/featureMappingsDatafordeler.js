"use strict";

var _ = require('underscore');

function parseInteger(str) {
  return parseInt(str, 10);
}

exports.afstemningsområde = {
  name: 'afstemningsområde',
  wfsName: 'Afstemningsomraade',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'id.lokalId',
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
    afstemningssstedadresse: {
      name: 'afstemningsstedAdresse',
      parseXml: (xml) => {
        console.dir(xml)
        return null;
      }
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
      name: 'id.lokalId',
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

exports.sogn = {
  name: 'sogn',
  wfsName: 'Sogneinddeling',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'id.lokalId',
      parseFn: parseInteger
    },
    kode: {
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
  fields: {
    dagi_id: {
      name: 'id.lokalId',
      parseFn: parseInteger
    },
    navn: 'navn',
    kommunekode: {
      name: 'kommunekode',
      parseFn: parseInteger
    }
  }
};

exports.opstillingskreds = {
  name: 'opstillingskreds',
  wfsName: 'Opstillingskreds',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'id.lokalId',
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