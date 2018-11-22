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
    ejerlavnavn: {
      name: 'ejerlavsnavn',
      parseFn: _.identity
    },
    matrikelnr: {
      name: 'matrikelnummer',
      parseFn: _.identity
    },
    featureid: {
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
    },
    moderjordstykke: {
      name: 'moderjordstykke',
      parseFn: val => val === '0' ? null : parseInteger(val)
    },
    registreretareal: {
      name: 'registreretAreal',
      parseFn: parseInteger
    },
    arealberegningsmetode: {
      name: 'arealBeregn',
      parseFn: _.identity
    },
    vejareal: {
      name: 'vejAreal',
      parseFn: parseInteger
    },
    vejarealberegningsmetode: {
      name: 'vejArealBeregn',
      parseFn: _.identity
    },
    vandarealberegningsmetode: {
      name: 'vandArealBeregn',
      parseFn: _.identity
    },
    fælleslod: {
      name: 'faelleslod',
      parseFn: val => val === 'ja'
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
