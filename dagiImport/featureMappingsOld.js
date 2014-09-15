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
  wfsName: 'KOMMUNE10',
  fields: {
    kode: {
      name: 'CPR_noegle',
      parseFn: parseInteger
    },
    navn: 'Navn'
  }
};

exports.region = {
  name: 'region',
  wfsName: 'REGION10',
  geometry: 'geometri',
  fields: {
    kode: {
      name: 'CPR_noegle',
      parseFn: parseInteger
    },
    navn: 'Navn'
  }
};

exports.sogn = {
  name: 'sogn',
  wfsName: 'SOGN10',
  geometry: 'geometri',
  fields: {
    kode: {
      name: 'CPR_noegle',
      parseFn: parseInteger
    },
    navn: 'Navn'
  }
};

exports.opstillingskreds = {
  name: 'opstillingskreds',
  wfsName: 'OPSTILLINGSKREDS10',
  geometry: 'geometri',
  fields: {
    kode: {
      name: 'Opstillingskredsnummer',
      parseFn: parseInteger
    },
    navn: 'Navn'
  }
};

exports.politikreds = {
  name: 'politikreds',
  wfsName: 'POLITIKREDS10',
  geometry: 'geometri',
  fields: {
    kode: {
      name: 'CPR_noegle',
      parseFn: parseInteger
    },
    navn: 'Navn'
  }
};

exports.retskreds = {
  name: 'retskreds',
  wfsName: 'RETSKREDS10',
  geometry: 'geometri',
  fields: {
    kode: {
      name: 'CPR_noegleq',
      parseFn: parseInteger
    },
    navn: 'Navn'
  }
};

exports.postnummer = {
  name: 'postnummer',
  wfsName: 'POSTDISTRIKT10',
  geometry: 'geometri',
  fields: {
    nr: {
      name: 'PostCodeLabelText',
      parseFn: parseInteger
    },
    navn: 'Navn'
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