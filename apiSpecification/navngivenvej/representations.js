"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');
var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
const commonSchemaDefinitions = require('../commonSchemaDefinitions');

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
const fieldsExcludedFromFlat = ['beliggenhed_vejnavnelinje', 'beliggenhed_vejnavneområde', 'beliggenhed_vejtilslutningspunkter', 'geom_json'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);
exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const miniFieldNames = ['id', 'darstatus', 'navn', 'adresseringsnavn'];

const miniFields = fields.filter(field => _.contains(miniFieldNames, field.name));

exports.mini = representationUtil.defaultFlatRepresentation(miniFields);


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
      administrerendekommune: commonSchemaDefinitions.KommuneRef,
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
            kode: normalizedVejstykkeFieldSchema('kode'),
            id: normalizedVejstykkeFieldSchema('id')
          },
          docOrder: ['href', 'kommunekode', 'kode']
        }
      },
      beliggenhed: schemaObject({
        description: 'Information om vejens beliggenhed',
        properties: {
          oprindelse: schemaObject({
            properties: {
              kilde: {
                type: 'string',
                description: '?'
              },
              tekniskstandard: {
                type: 'string',
                description: '?'
              },
              nøjagtighedsklasse: {
                type: 'string',
                description: '?'
              },
              registrering: Object.assign({}, commonSchemaDefinitions.DateTimeUtc, {
                description: '?'
              })
            },
            docOrder: ['kilde', 'tekniskstandard', 'nøjagtighedsklasse', 'registrering']
          }),
          geometritype: {
            type: 'string',
            description: 'Anvender typen af geometri for den navngivne vej: "vejnavnelinje" eller "vejn'
          },
          vejtilslutningspunkter: {
            type: ['null', 'object'],
            description: 'Vejtilslutningspunkter for den navngivne vej',
            properties: {
              type: {},
              coordinates: {}
            }
          }
        },
        docOrder: ['oprindelse', 'geometritype', 'vejtilslutningspunkter']
      })
    },
    docOrder: ['href', 'id', 'darstatus', 'navn', 'adresseringsnavn', 'historik', 'administrerendekommune', 'retskrivningskontrol', 'udtaltvejnavn', 'vejstykker', 'beliggenhed']
  }),
  fields: _.where(fields, {'selectable' : true}),
  mapper: function(baseUrl) {
    return function(row) {
      return {
        id: row.id,
        href: makeHref(baseUrl, 'navngivenvej', [row.id]),
        darstatus: commonMappers.formatDarStatus(row.darstatus),
        navn: row.navn,
        adresseringsnavn: row.adresseringsnavn,
        administrerendekommune: commonMappers.mapKode4NavnTema('kommune', row.administrerendekommunekode, row.administrerendekommunenavn, baseUrl),
        retskrivningskontrol: row.retskrivningskontrol,
        udtaltvejnavn: row.udtaltvejnavn,
        historik: {
          oprettet: d(row.oprettet),
          ændret: d(row.ændret)
        },
        vejstykker:
          (row.vejstykker || []).map(vejstykke => commonMappers.mapVejstykkeRef(vejstykke, baseUrl)),
        beliggenhed: {
          oprindelse: {
            kilde: row.beliggenhed_oprindelse_kilde,
            tekniskstandard: row.beliggenhed_oprindelse_tekniskstandard,
            registrering: row.beliggenhed_oprindelse_registrering,
            nøjagtighedsklasse: row.beliggenhed_oprindelse_nøjagtighedsklasse
          },
          vejtilslutningspunkter: row.beliggenhed_vejtilslutningspunkter ? JSON.parse(row.beliggenhed_vejtilslutningspunkter ) : null,
          geometritype: row.beliggenhed_geometritype
        }
      };
    };
  }
};

const autocompleteFieldNames = ['id', 'darstatus', 'navn', 'adresseringsnavn']

const autocompleteFields = fields.filter(field => autocompleteFieldNames.includes(field.name));

exports.autocomplete = {
  schema: globalSchemaObject( {
    properties: {
      tekst: {
        description: 'Navnet på den navngivne vej',
        type: 'string'
      },
      navngivenvej: schemaObject({
        description: 'Link og basale data for den navngivne vej',
        properties: {
          'href': {
            description: 'Den navngivne vejs unikke URL.',
            $ref: '#/definitions/Href'
          },
          'id': normalizedFieldSchema('id'),
          'darstatus': normalizedFieldSchema('darstatus'),
          'navn': normalizedFieldSchema('navn'),
          'adresseringsnavn': normalizedFieldSchema('adresseringsnavn'),
        },
        docOrder: ['href', 'id', 'darstatus', 'navn', 'adresseringsnavn']
      })
    },
    docOrder: ['tekst', 'navngivenvej']
  }),
  fields: autocompleteFields,
  mapper: function (baseUrl, params) {
    return function(row) {
      return {
        tekst: row.navn,
        navngivenvej: {
          href: makeHref(baseUrl, 'navngivenvej', [row.id]),
          id: row.id,
          darstatus: commonMappers.formatDarStatus(row.darstatus),
          navn: row.navn,
          adresseringsnavn: row.adresseringsnavn
        }
      };
    };
  }
};


const geojsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

const miniWithoutCordsRep = representationUtil.defaultFlatRepresentation(miniFields);
exports.geojsonMini=representationUtil.geojsonRepresentation(geojsonField, miniWithoutCordsRep);


var registry = require('../registry');
registry.addMultiple('navngivenvej', 'representation', module.exports);
