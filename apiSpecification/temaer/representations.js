"use strict";

var _ = require('underscore');
var dagiTemaer = require('./temaer');
var representationUtil = require('../common/representationUtil');
var fieldMap = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var additionalFields = require('./additionalFields');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHrefFromPath = commonMappers.makeHrefFromPath;

var registry = require('../registry');


// postnumre eksporteres ikke
_.filter(dagiTemaer, function(tema) {
  return tema.singular !== 'postnummer';
}).forEach(function(tema) {
  var fields = fieldMap[tema.singular];
  var representations = {};
  var fieldsExcludedFromFlat = ['geom_json'];
  var flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);

  representations.flat = representationUtil.defaultFlatRepresentation(flatFields);
  function jsonSchema(additionalFields) {
    var result = {
      title: tema.singular,
      properties: {
        'href': {
          description: tema.singularSpecific + 's unikke URL.',
          $ref: '#/definitions/Href'
        }
      },
      docOrder: ['href']
    };
    additionalFields.forEach(function(fieldSpec) {
      result.properties[fieldSpec.name] = fieldSpec.schema;
      result.docOrder.push(fieldSpec.name);
    });
    return result;
  }
  function dagiTemaJsonMapper(keyFieldName, additionalFields) {
    return function(baseUrl) {
      return function(row) {
        var result = {};
        additionalFields.forEach(function(fieldSpec) {
          result[fieldSpec.name] = fieldSpec.formatter(row[fieldSpec.name]);
        });

        result.href = makeHrefFromPath(baseUrl, tema.plural, [result[keyFieldName]]);

        return result;
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
    properties[tema.singular] = jsonSchema(additionalFields[tema.singular]);
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
    schema: globalSchemaObject(jsonSchema(additionalFields[tema.singular])),
    mapper: dagiTemaJsonMapper(tema.key, additionalFields[tema.singular])
  };
  representations.autocomplete = {
    fields: representations.json.fields,
    schema: globalSchemaObject(dagiAutocompleteSchema()),
    mapper: dagiTemaAutocompleteMapper()
  };
  representations.geojson = representationUtil.geojsonRepresentation(_.findWhere(fields, {name: 'geom_json'}), representations.flat);
  exports[tema.singular] = representations;

  registry.addMultiple(tema.singular, 'representation', module.exports[tema.singular]);});
