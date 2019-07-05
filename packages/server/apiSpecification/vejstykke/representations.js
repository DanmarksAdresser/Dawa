"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
const commonSchemaDefinitions = require('../commonSchemaDefinitions');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');
var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('vejstykke', fieldName);
};


var d = util.d;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var mapPostnummerRefArray = commonMappers.mapPostnummerRefArray;
var mapKommuneRef = commonMappers.mapKommuneRef;
var kode4String = require('../util').kode4String;
var schemaObject = schemaUtil.schemaObject;

exports.flat = representationUtil.defaultFlatRepresentation(representationUtil.fieldsWithoutNames(fields, ['geom_json']));

var autocompleteFieldNames = ['navn', 'kommunekode', 'kode'];
var autocompleteFields = _.filter(fields, function(field) {
  return _.contains(autocompleteFieldNames, field.name);
});

const miniSchema = globalSchemaObject({
  properties: Object.assign({},
    commonSchemaDefinitions.VejstykkeRef.properties,
    {
      adresseringsnavn: normalizedFieldSchema('adresseringsnavn'),
      kommunenavn: {
        type: 'string',
        description: 'Navnet på den kommune, som vejstykket er beliggende i.'
      },
      navngivenvej_id: normalizedFieldSchema('navngivenvej_id'),
      tekst: {
        type: 'string',
        description: 'Navnet på vejstykket efterfulgt af kommunen på formen "{vejnavn}, ${kommunenavn} kommune"',
      }
    }),
  docOrder: ['href', 'kommunekode','kode', 'navn', 'adresseringsnavn', 'tekst', 'kommunenavn', 'navngivenvej_id']
});

exports.mini = representationUtil.miniRepresentation([
  'kommunekode', 'kode', 'navn', 'adresseringsnavn', 'kommunenavn', 'navngivenvej_id'],
  fields,
  miniSchema,
  (baseUrl, row) => makeHref(baseUrl, 'vejstykke', [row.kommunekode, row.kode]),
  row => `${row.navn}, ${row.kommunenavn} kommune`);

exports.autocomplete = {
  schema: globalSchemaObject( {
    properties: {
      tekst: {
        description: 'Navnet på vejstykket',
        type: 'string'
      },
      vejstykke: {
        description: 'Link og basale data for vejstykket',
        $ref: '#/definitions/VejstykkeRef'
      }
    },
    docOrder: ['tekst', 'vejstykke']
  }),
  fields: autocompleteFields,
  mapper: function (baseUrl, params) {
    return function(row) {
      return {
        tekst: row.navn,
        vejstykke: {
          href: makeHref(baseUrl, 'vejstykke', [row.kommunekode, row.kode]),
          kommunekode: kode4String(row.kommunekode),
          kode: kode4String(row.kode),
          navn: row.navn
        }
      };
    };
  }
};

exports.json = {
  schema: globalSchemaObject({
    'title': 'vejstykke',
    'properties': {
      'href': {
        description: 'Vejstykkets unikke URL.',
        $ref: '#/definitions/Href'
      },
      'id': normalizedFieldSchema('id'),
      'kode': normalizedFieldSchema('kode'),
      'navn' : normalizedFieldSchema('navn'),
      'darstatus': {
        type: 'integer',
        description: 'Vejstykkets statuskode. 3=gældende, 4=nedlagt.'
      },
      'adresseringsnavn': normalizedFieldSchema('adresseringsnavn'),
      'kommune': {
        description: 'Kommunen som vejstykket er beliggende i.',
        $ref: '#/definitions/KommuneRef'
      },
      navngivenvej: schemaObject({
        description: 'Den navngivne vej, som vejstykket er en del af',
        properties: {
          href: {
            description: 'Den navngivne vejs unikke URL',
            type: 'string'
          },
          id: Object.assign({}, commonSchemaDefinitions.UUID, {
            description: 'Den navngivne vejs unikke ID (UUID)',
          }),
          darstatus: {
            type: 'integer'
          }
        },
        docOrder: ['href', 'id', 'darstatus']
      }),
      'postnumre': {
        description: `De postnumre som optræder i adresser på vejstykket. 
        Da det er adresserne der udgør datagrundlaget vil vejstykker uden adresser ikke have nogle postnumre.
        <a href="/dok/api/navngivenvej">Navngivenvej</a> har postnummertilknytninger, som er beregnet ud fra vejgeometrien.`,
        type: 'array',
        items: {
          $ref: '#/definitions/PostnummerRef'
        }
      },
      'historik' : schemaObject({
        'description': 'Væsentlige tidspunkter for vejstykket',
        properties: {
          'oprettet': normalizedFieldSchema('oprettet'),
          'ændret': normalizedFieldSchema('ændret'),
          'nedlagt': {
            description: 'Tidspunktet for vejstykkets nedlæggelse som registreret i DAR',
            type: ['string', 'null']
          }
        },
        docOrder: ['oprettet', 'ændret', 'nedlagt']
      })
    },
    docOrder: ['id','href', 'darstatus', 'kode', 'navn', 'adresseringsnavn', 'navngivenvej', 'kommune', 'postnumre', 'historik']
  }),
  fields: representationUtil.fieldsWithoutNames(_.where(fields, {'selectable' : true}), ['geom_json']),
  mapper: function(baseUrl) {
    return function(row) {
      return {
        id: row.id,
        darstatus: row.darstatus,
        href: makeHref(baseUrl, 'vejstykke', [row.kommunekode, row.kode]),
        kode: kode4String(row.kode),
        navn: row.navn,
        adresseringsnavn: row.adresseringsnavn,
        navngivenvej: {
          href: makeHref(baseUrl, 'navngivenvej', [row.navngivenvej_id]),
          id: row.navngivenvej_id,
          darstatus: row.navngivenvej_darstatus
        },
        kommune: mapKommuneRef({ kode: row.kommunekode, navn: row.kommunenavn}, baseUrl),
        postnumre: mapPostnummerRefArray(row.postnumre || [], baseUrl),
        historik: {
          oprettet: d(row.oprettet),
          ændret: d(row.ændret),
          nedlagt: d(row.nedlagt)
        }
      };
    };
  }
};
const geomJsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geomJsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geomJsonField, exports.json);

var registry = require('../registry');
registry.addMultiple('vejstykke', 'representation', module.exports);
