"use strict";

var _ = require('underscore');
var dagiTemaer = require('./dagiTemaer');
var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHrefFromPath = commonMappers.makeHrefFromPath;

var kode4String = require('../util').kode4String;

var registry = require('../registry');


dagiTemaer.forEach(function(tema) {
  var representations = {};
  var fieldsExcludedFromFlat = ['geom_json'];
  var flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);

  representations.flat = representationUtil.defaultFlatRepresentation(flatFields);
  function dagiSchema() {
    return  {
      'title': tema.singular,
      'properties': {
        'href': {
          description: tema.singularSpecific + 's unikke URL.',
          $ref: '#/definitions/Href'
        },
        'kode': {
          description: 'Fircifret ' + tema.singular + 'kode.',
          $ref: '#/definitions/Kode4'
        },
        'navn': {
          description: tema + tema.singularSpecific + 's navn.',
          type: 'string'
        }
      },
      'docOrder': ['href', 'kode', 'navn']
    };
  }
  function dagiTemaJsonMapper() {
    return function(baseUrl) {
      return function(row) {
        return {
          href: makeHrefFromPath(baseUrl, tema.plural, [row.kode]),
          kode: kode4String(row.kode),
          navn: row.navn
        };
      };
    };
  }

  function dagiAutocompleteSchema() {
    var properties = {
      tekst: {
        description: 'Koden efterfulgt af navnet på ' + tema.singularSpecific,
        type: 'string'
      }
    };
    properties[tema.singular] = {
      description: tema.singularSpecific,
      $ref: '#/definitions/' + tema.singular + 'Ref'
    };
    return globalSchemaObject({
      properties: properties,
      docOrder: ['tekst', tema.singular]
    });
  }

  function dagiTemaAutocompleteMapper() {
    return function(baseUrl) {
      var dagiTemaMapper = representations.json.mapper(baseUrl);
      return function(row) {
        var result = {
          tekst: '' + row.kode + ' ' + row.navn
        };
        result[tema.singular] = dagiTemaMapper(row);
        return result;
      };
    };
  }

  representations.json = {
    // geomentry for the (huge) DAGI temaer is only returned in geojson format.
    fields: representationUtil.fieldsWithoutNames(fields, ['geom_json']),
    schema: globalSchemaObject(dagiSchema(tema)),
    mapper: dagiTemaJsonMapper()
  };
  representations.autocomplete = {
    fields: representations.json.fields,
    schema: globalSchemaObject(dagiAutocompleteSchema()),
    mapper: dagiTemaAutocompleteMapper()
  };
  representations.geojson = representationUtil.geojsonRepresentation(_.findWhere(fields, {name: 'geom_json'}), representations.flat);
  exports[tema.singular] = representations;

  registry.addMultiple(tema.singular, 'representation', module.exports[tema.singular]);});

