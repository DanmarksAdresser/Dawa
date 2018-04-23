"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');
var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('navngivenvej', fieldName);
};

var normalizedVejstykkeFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('vejstykke', fieldName);
};

var d = util.d;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var schemaObject = schemaUtil.schemaObject;

exports.flat = representationUtil.defaultFlatRepresentation(fields);

exports.json = {
  schema: globalSchemaObject({
    'title': 'navngivenvej',
    'properties': {
      'href': {
        description: 'Den navngivne vejs unikke URL.',
        $ref: '#/definitions/Href'
      },
      'id': normalizedFieldSchema('id'),
      'darstatus': normalizedFieldSchema('darstatus'),
      'navn': normalizedFieldSchema('navn'),
      'adresseringsnavn': normalizedFieldSchema('adresseringsnavn'),
      'historik' : schemaObject({
        'description': 'Væsentlige tidspunkter for vejstykket',
        properties: {
          'oprettet': normalizedFieldSchema('oprettet'),
          'ændret': normalizedFieldSchema('ændret')
        },
        docOrder: ['oprettet', 'ændret']

      }),
      administreresafkommune: normalizedFieldSchema('administreresafkommune'),
      beskrivelse: normalizedFieldSchema('beskrivelse'),
      retskrivningskontrol: normalizedFieldSchema('retskrivningskontrol'),
      udtaltvejnavn: normalizedFieldSchema('udtaltvejnavn'),
      vejstykker: {
        description: 'De vejstykker, den navngivne vej består af',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            'href': {
              description: 'Vejstykkets unikke URL.',
              $ref: '#/definitions/Href'
            },
            kommunekode: normalizedVejstykkeFieldSchema('kommunekode'),
            kode: normalizedVejstykkeFieldSchema('kode')
          },
          docOrder: ['href', 'kommunekode', 'kode']
        }
      }
    },
    docOrder: ['href', 'id', 'darstatus', 'navn', 'adresseringsnavn', 'historik', 'administreresafkommune', 'beskrivelse', 'retskrivningskontrol', 'udtaltvejnavn', 'vejstykker']
  }),
  fields: _.where(fields, {'selectable' : true}),
  mapper: function(baseUrl) {
    return function(row) {
      return {
        id: row.id,
        href: makeHref(baseUrl, 'navngivenvej', [row.id]),
        darstatus: row.darstatus,
        navn: row.navn,
        adresseringsnavn: row.adresseringsnavn,
        administreresafkommune: util.kode4String(row.administreresafkommune),
        beskrivelse: row.beskrivelse,
        retskrivningskontrol: row.retskrivningskontrol,
        udtaltvejnavn: row.udtaltvejnavn,
        historik: {
          oprettet: d(row.oprettet),
          ændret: d(row.ændret)
        },
        vejstykker:
          (row.vejstykker || []).map(vejstykke => commonMappers.mapVejstykkeRef(vejstykke, baseUrl))
      };
    };
  }
};

var registry = require('../registry');
registry.addMultiple('navngivenvej', 'representation', module.exports);
