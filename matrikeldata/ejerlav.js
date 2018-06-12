"use strict";

var _ = require('underscore');

const { go } = require('ts-csp');

const { gmlToJson, extractFeatures } = require('../dagiImport/temaParsing');


function parseInteger(str) {
  return parseInt(str, 10);
}

const jordstykkeMapping = {
  name: 'jordstykke',
  wfsName: 'Jordstykke',
  fields: {
    ejerlavkode: {
      name: 'landsejerlavskode',
      parseFn: parseInteger
    },
    matrikelnr: {
      name: 'matrikelnummer',
      parseFn: _.identity
    },
    featureID: {
      name: 'featureID',
      parseFn: parseInteger
    },
    regionskode: {
      name: 'regionskode',
      parseFn: parseInteger
    },
    sognekode: {
      name: 'sognekode',
      parseFn: parseInteger
    },
    kommunekode: {
      name: 'kommunekode',
      parseFn: parseInteger
    },
    retskredskode: {
      name: 'retskredskode',
      parseFn: parseInteger
    },
    esrejendomsnr: {
      name: 'esr_Ejendomsnummer',
      path: ['harSamletFastEjendom', 'SFESamletFastEjendom'],
      parseFn: (strValue) => {
        if (strValue.length > 7) {
          return parseInteger(strValue.substring(3));
        }
        else {
          const integer = parseInteger(strValue);
          if (integer === 0) {
            return null;
          }
          return integer;
        }
      }
    },
    udvidet_esrejendomsnr: {
      name: 'esr_Ejendomsnummer',
      path: ['harSamletFastEjendom', 'SFESamletFastEjendom'],
      parseFn: (strValue) => {
        const integer = parseInteger(strValue);
        if (integer === 0) {
          return null;
        }
        return integer;
      }
    },
    sfeejendomsnr: {
      name: 'sfe_Ejendomsnummer',
      path: ['harSamletFastEjendom', 'SFESamletFastEjendom'],
      parseFn: parseInteger
    }
  },
  filterFn: function () {
    return true;
  }
};

const ejerlavMapping = {
  name: 'ejerlav',
  wfsName: 'Ejerlav',
  fields: {
    kode: {
      name: 'landsejerlavskode',
      parseFn: parseInteger
    },
    navn: {
      name: 'ejerlavsnavn',
      parseFn: _.identity
    }
  },
  filterFn: function () {
    return true;
  }
};

exports.parseEjerlav =  (body) => go(function*() {
  const json = yield gmlToJson(body);
  const jordstykker = extractFeatures(json, jordstykkeMapping);
  const ejerlav = extractFeatures(json, ejerlavMapping);
  return {jordstykker, ejerlav};
});
