"use strict";

var _ = require('underscore');

function parseInteger(str) {
  return parseInt(str, 10);
}

exports.kommune = {
  name: 'kommune',
  geometry: 'geometri',
  wfsName: 'Kommuneinddeling',
  fields: {
    dagi_id: {
      name: 'id.lokalId',
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
    udenforkommuneinddeling: {
      name: 'udenforKommuneinddeling',
      parseFn: value => value !== 'false'
    },
    navn: 'navn'
  }
};

exports.region = {
  name: 'region',
  wfsName: 'Regionsinddeling',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'id.lokalId',
      parseFn: parseInteger
    },
    kode: {
      name: 'regionskode',
      parseFn: parseInteger
    },
    navn: 'navn',
    nuts2: 'NUTS2vaerdi'
  }
};




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
    afstemningsstedadresse: {
      name: 'afstemningsstedAdresse',
      parseXml: (xml) => {
        const attrs = xml['$'];
        const hrefAttr = Object.keys(attrs).filter(attrName => attrName.includes('href'))[0];
        if(hrefAttr) {
          const uuid = attrs[hrefAttr].substring(attrs[hrefAttr].indexOf('#') + 1);
          return uuid;
        }
        else {
          return null;
        }
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

exports.politikreds = {
  name: 'politikreds',
  wfsName: 'Politikreds',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'id.lokalId',
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
      name: 'id.lokalId',
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
      name: 'id.lokalId',
      parseFn: parseInteger
    },
    nr: {
      name: 'postnummer',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.landsdel = {
  name: 'landsdel',
  wfsName: 'Landsdel',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'id.lokalId',
      parseFn: parseInteger
    },
    navn: 'navn',
    nuts3: 'NUTS3vaerdi'
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