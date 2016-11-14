"use strict";

const registry = require('../registry');

const commonSchemaDefinitions = require('../commonSchemaDefinitions');
const kode4String = require('../util').kode4String;


module.exports = {
  bebyggelse: {
    singular: 'bebyggelse',
    plural: 'bebyggelser',
    singularSpecific: 'bebyggelsen',
    prefix: 'bebyggelses',
    fields: [{
      name: 'id',
      type: 'string',
      schema: commonSchemaDefinitions.UUID,
      description: 'Unik identifikator for bebyggelsen.'
    },{
      name: 'kode',
      type: ['integer', 'null'],
      description: 'Unik kode for bebyggelsen.'
    }, {
      name: 'type',
      type: 'string',
      description: 'Angiver typen af bebyggelse. Mulige værdier: "by", "bydel", "spredtBebyggelse", "sommerhusområde", "sommerhusområdedel", "industriområde", "kolonihave", "storby".',
      schema: {
          enum: [
            'kolonihave',
            'sommerhusområdedel',
            'industriområde',
            'storby',
            'by',
            'spredtBebyggelse',
            'sommerhusområde',
            'bydel'
          ]

      }
    }, {
      name: 'navn',
      type: 'string',
      description: 'Bebyggelsens navn.'
    }],
    filters: ['type', 'navn'],
    key: ['id'],
    geometryType: 'area'
  },
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
        formatter: kode4String
      }, {
        name: 'sognekode',
        description: 'Sognekoden',
        type: 'string',
        schema: commonSchemaDefinitions.Kode4,
        formatter: kode4String
      }, {
        name: 'regionskode',
        description: 'Regionskoden',
        type: 'string',
        schema: commonSchemaDefinitions.Kode4,
        formatter: kode4String
      }, {
        name: 'retskredskode',
        description: 'Retskredskoden, som er tilknyttet jordstykket, angiver hvilken ret den matrikulære registreringsmeddelse er sendt til. Efter 2008 sendes alle registreringsmeddelser til tinglysningsretten i Hobro, som i Matriklen har retskredskode 1180. I denne forbindelse anvender Matriklen et andet retskredsbegreb end DAGI, hvor retskredskoden 1180 ikke eksisterer.',
        type: 'string',
        schema: commonSchemaDefinitions.Kode4,
        formatter: kode4String
      }, {
        name: 'esrejendomsnr',
        type: 'string',
        description: 'Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret,' +
        ' ESR, som jordstykket er en del af.' +
        ' Repræsenteret ved op til syv cifre. Eksempel ”13606”.',
        schema: commonSchemaDefinitions.Nullableesrejendomsnr
      }, {
        name: 'sfeejendomsnr',
        type: 'string',
        description: 'SFE ejendomsnummer.',
        schema: commonSchemaDefinitions.Nullablesfeejendomsnr
      }
    ],
    filters: ['ejerlavkode', 'matrikelnr', 'kommunekode', 'regionskode', 'sognekode', 'retskredskode', 'esrejendomsnr', 'sfeejendomsnr'],
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
