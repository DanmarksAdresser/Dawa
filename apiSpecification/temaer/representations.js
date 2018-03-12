"use strict";

var _ = require('underscore');
var representationUtil = require('../common/representationUtil');
var fieldMap = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHrefFromPath = commonMappers.makeHrefFromPath;
const temaModels = require('../../dagiImport/temaModels');

var registry = require('../registry');

var nameOnlyAutocomplete =  {
  description: function(tema) {
    return 'Navnet på ' + tema.singularSpecific;
  },
  mapper: function (row) {
    return row.navn;
  }
};

var autocompleteTekst = {
  valglandsdel: nameOnlyAutocomplete,
  storkreds: nameOnlyAutocomplete,
  menighedsrådsafstemningsområde: nameOnlyAutocomplete,
  afstemningsområde: nameOnlyAutocomplete
};
var kodeAndNavnTemaer = ['region', 'kommune', 'sogn', 'opstillingskreds', 'retskreds', 'politikreds'];
kodeAndNavnTemaer.forEach(function (dagiTemaNavn) {
  autocompleteTekst[dagiTemaNavn] = {
      description: function(tema) {
        return 'Koden efterfulgt af navnet på ' + tema.singularSpecific;
    },
    mapper: function(row) {
      return '' + row.kode + ' ' + row.navn;
    }
  };
});





function schemaForFlatFields(model, excludedFieldNames) {
  var result = {
    title: model.singular,
    properties: {
      'href': {
        description: model.singularSpecific + 's unikke URL.',
        $ref: '#/definitions/Href'
      },
      'ændret': {
        description: 'Tidspunkt for seneste ændring registreret i DAWA. Opdateres ikke hvis ændringen kun vedrører' +
        ' geometrien (se felterne geo_ændret og geo_version).',
        $ref: '#/definitions/DateTimeUtc'
      },
      'geo_ændret': {
        description: 'Tidspunkt for seneste ændring af geometrien registreret i DAWA.',
        $ref: '#/definitions/DateTimeUtc'
      },
      geo_version: {
        description: 'Versionsangivelse for geometrien. Inkrementeres hver gang geometrien ændrer sig i DAWA.',
        type: 'integer'
      }
    },
    docOrder: ['href', 'ændret', 'geo_ændret', 'geo_version']
  };

  model.fields.filter(function (additionalField) {
    return !_.contains(excludedFieldNames, additionalField.name);
  }).forEach(function (fieldSpec) {
    result.properties[fieldSpec.name] = _.clone(fieldSpec.schema);
    result.properties[fieldSpec.name].description = fieldSpec.description;
    result.docOrder.push(fieldSpec.name);
  });
  return result;
}


// postnumre, zoner eksporteres ikke
temaModels.modelList.filter(model => model.published).forEach(model => {
  const fields = fieldMap[model.singular];
  var representations = {};
  var fieldsExcludedFromFlat = ['geom_json'];
  var flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);


  representations.flat = representationUtil.defaultFlatRepresentation(flatFields);
  function jsonSchema() {
    return schemaForFlatFields(model, []);
  }
  function dagiTemaJsonMapper() {
    return function(baseUrl) {
      return function(row) {
        var result = {};
        model.fields.forEach(function(fieldSpec) {
          result[fieldSpec.name] = fieldSpec.formatter(row[fieldSpec.name]);
        });

        result.ændret =  row.ændret;
        result.geo_version = row.geo_version;
        result.geo_ændret = row.geo_ændret;

        result.href = makeHrefFromPath(baseUrl, model.plural, _.map(model.primaryKey, function(keyName) { return result[keyName]; }));

        return result;
      };
    };
  }

  function dagiAutocompleteSchema() {
    var properties = {
      tekst: {
        description: autocompleteTekst[model.singular].description(model),
        type: 'string'
      }
    };
    properties[model.singular] = jsonSchema();
    return globalSchemaObject({
      properties: properties,
      docOrder: ['tekst', model.singular]
    });
  }

  function dagiTemaAutocompleteMapper() {
    return function(baseUrl) {
      var dagiTemaMapper = representations.json.mapper(baseUrl);
      return function(row) {
        var result = {
          tekst: autocompleteTekst[model.singular].mapper(row)
        };
        result[model.singular] = dagiTemaMapper(row);
        return result;
      };
    };
  }
  representations.json = {
    // geomentry for the (huge) DAGI temaer is only returned in geojson format.
    fields: representationUtil.fieldsWithoutNames(fields, ['geom_json']),
    schema: globalSchemaObject(jsonSchema()),
    mapper: dagiTemaJsonMapper(model.primaryKey)
  };
  if(model.searchable) {
    representations.autocomplete = {
      fields: representations.json.fields,
      schema: globalSchemaObject(dagiAutocompleteSchema()),
      mapper: dagiTemaAutocompleteMapper()
    };
  }
  const geojsonField = _.findWhere(fields, {name: 'geom_json'});
  representations.geojson = representationUtil.geojsonRepresentation(geojsonField, representations.flat);
  exports[model.singular] = representations;

  registry.addMultiple(model.singular, 'representation', module.exports[model.singular]);
});