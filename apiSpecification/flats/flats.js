"use strict";

const registry = require('../registry');
const commonSchemaDefinitions = require('../commonSchemaDefinitions');
const kode4String = require('../util').kode4String;

// ESR ejendomsnummer er en streng i databasen,
// men parameteren skal fortolkes som et tal og tillade
// foranstillede nuller.
const processIntegerAsString = str => {
  while(str.length > 0 && str[0] === '0') {
    str = str.substring(1);
  }
  if(str === '') {
    str = '0';
  }
  return str;
};

const kode4ParameterSchema = {
    type: 'string',
    pattern: '^\\d{1,4}$'
  };


module.exports = {
  jordstykke: {
    singular: 'jordstykke',
    plural: 'jordstykker',
    singularSpecifik: 'jordstykket',
    prefix: 'jordstykke',
    fields: [
      {
        name: 'ejerlavkode',
        description: 'Landsejerlavkode for det ejerlav, som jordstykket tilhører',
        type: 'integer',
        schema: commonSchemaDefinitions.UpTo7
      }, {
        name: 'matrikelnr',
        type: 'string',
        description: 'Matrikelnummeret for jordstykket. Udgør sammen med ejerlavkoden en unik nøgle for jordstykket.',
        schema: commonSchemaDefinitions.matrikelnr
      }, {
        name: 'kommunekode',
        description: 'Kommunekoden.',
        type: 'string',
        schema: commonSchemaDefinitions.Kode4,
        parameterSchema: kode4ParameterSchema,
        processParameter: processIntegerAsString,
        formatter: kode4String
      }, {
        name: 'sognekode',
        description: 'Sognekoden',
        type: 'string',
        schema: commonSchemaDefinitions.Kode4,
        parameterSchema: kode4ParameterSchema,
        processParameter: processIntegerAsString,
        formatter: kode4String
      }, {
        name: 'regionskode',
        description: 'Regionskoden',
        type: 'string',
        schema: commonSchemaDefinitions.Kode4,
        parameterSchema: kode4ParameterSchema,
        processParameter: processIntegerAsString,
        formatter: kode4String
      }, {
        name: 'retskredskode',
        description: 'Retskredskoden, som er tilknyttet jordstykket, angiver hvilken ret den matrikulære registreringsmeddelse er sendt til. Efter 2008 sendes alle registreringsmeddelser til tinglysningsretten i Hobro, som i Matriklen har retskredskode 1180. I denne forbindelse anvender Matriklen et andet retskredsbegreb end DAGI, hvor retskredskoden 1180 ikke eksisterer.',
        type: 'string',
        schema: commonSchemaDefinitions.Kode4,
        parameterSchema: kode4ParameterSchema,
        processParameter: processIntegerAsString,
        formatter: kode4String
      }, {
        name: 'udvidet_esrejendomsnr',
        type: 'string',
        description: 'Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret,' +
        ' ESR, som jordstykket er en del af.' +
        ' Repræsenteret ved 10 cifre, hvor de første 3 cifre er kommunekoden hvor ejerskabet er placeret. Eksempel ”6070035512”.',

        schema: {
          type: ['null', 'string']
        },
        parameterSchema: {
          type: 'string',
          pattern: '^\\d{1,10}$'
        },
        processParameter: processIntegerAsString
      }, {
        name: 'esrejendomsnr',
        description: 'Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret,' +
        ' ESR, som jordstykket er en del af.' +
        ' Repræsenteret ved 7 cifre. Eksempel ”0035512”.',
        schema: commonSchemaDefinitions.Nullableesrejendomsnr,
        parameterSchema: {
          type: 'string',
          pattern: '^\\d{1,7}$'
        },
        processParameter: processIntegerAsString,
      }, {
        name: 'sfeejendomsnr',
        type: 'string',
        description: 'SFE ejendomsnummer.',
        schema: commonSchemaDefinitions.Nullablesfeejendomsnr
      }
    ],
    secondaryFields: [{name: 'ejerlavnavn'}],
    filters: ['ejerlavkode', 'matrikelnr', 'kommunekode', 'regionskode', 'sognekode', 'retskredskode', 'esrejendomsnr', 'udvidet_esrejendomsnr', 'sfeejendomsnr'],
    key: ['ejerlavkode', 'matrikelnr'],
    geometryType: 'area',
    legacyReverseResource: true,
    structuredJsonRepresentation: true,
    uniqueTilknytning: true
  }
};

Object.keys(module.exports).forEach(flatName => {
  registry.add(flatName, 'nameAndKey', undefined, module.exports[flatName]);
});
