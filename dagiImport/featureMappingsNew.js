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
    kode: {
      name: 'kommunekode',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

exports.region = {
  name: 'region',
  wfsName: 'Regionsinddeling',
  geometry: 'geometri',
  fields: {
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
    kode: {
      name: 'Opstillingskredsnummer',
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
    nr: {
      name: 'postnummer',
      parseFn: parseInteger
    },
    navn: 'navn'
  }
};

// normalize, such that every field has a name and a parseFn.
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
});