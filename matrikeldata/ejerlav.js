"use strict";

var _ = require('underscore');

var tema = require('../temaer/tema');


function parseInteger(str) {
  return parseInt(str, 10);
}

exports.parseEjerlav = function (body) {
  var mapping = {
    name: 'jordstykke',
    geometry: 'surfaceProperty',
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

  return tema.parseGml(body, 'jordstykke', ['ejerlavkode', 'matrikelnr'], mapping);
}

exports.storeEjerlav = function (ejerlavkode, jordstykker, client, options) {
  var temaDef = tema.findTema('jordstykke');
  return tema.putTemaer(temaDef, jordstykker, client, options.init, {ejerlavkode: ejerlavkode}, false);
};
