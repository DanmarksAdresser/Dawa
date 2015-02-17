"use strict";

var _ = require('underscore');
var dagiTemaer = require('./temaer');
var representationUtil = require('../common/representationUtil');
var fieldMap = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitions = require('../commonSchemaDefinitions');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var additionalFields = require('./additionalFields');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var makeHrefFromPath = commonMappers.makeHrefFromPath;

var registry = require('../registry');

var autocompleteTekst = {
  valglandsdel: {
    description: function(tema) {
      return 'Bogstav efterfulgt af navnet på ' + tema.singularSpecific;
    },
    mapper: function (row) {
      return "" + row.bogstav + ' ' + row.navn;
    }
  }
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





function schemaForFlatFields(tema, additionalFieldsSpec, excludedFieldNames) {
  var result = {
    title: tema.singular,
    properties: {
      'href': {
        description: tema.singularSpecific + 's unikke URL.',
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

  additionalFieldsSpec.filter(function (additionalField) {
    return !_.contains(excludedFieldNames, additionalField.name);
  }).forEach(function (fieldSpec) {
    result.properties[fieldSpec.name] = _.clone(fieldSpec.schema);
    result.properties[fieldSpec.name].description = fieldSpec.description;
    result.docOrder.push(fieldSpec.name);
  });
  return result;
}

var jordstykkeJsonSchema = function() {
  var tema = _.findWhere(dagiTemaer, { singular: 'jordstykke'});
  var schema = schemaForFlatFields(tema, additionalFields.jordstykke, ['ejerlavkode', 'kommunekode', 'regionskode',
    'retskredskode', 'sognekode']);
  schema.properties.ejerlav = {
    description: 'Ejerlavet som jordstykket tilhører.',
    $ref: '#/definitions/EjerlavRef'
  };
  schema.properties.kommune = {
    description: 'Kommunen som jordstykket er beliggende i.',
      $ref: '#/definitions/NullableKommuneRef'
  };
  schema.properties.region = {
    description: 'Regionen som jordstykket er beliggende i.',
    $ref: '#/definitions/NullableRegionsRef'
  };
  schema.properties.sogn = {
    description: 'Sognet som jordstykket er beliggende i.',
    $ref: '#/definitions/NullableSogneRef'
  };
  schema.properties.retskreds = {
    description: 'Retskredsen som jordstykket er beliggende i.',
    $ref: '#/definitions/NullableRetskredsRef'
  };

  schema.docOrder = schema.docOrder.concat(['ejerlav', 'kommune', 'region', 'sogn', 'retskreds']);
  return globalSchemaObject(schema);
};

var customRepresentations = {
  jordstykke: {
    json: {
      fields: representationUtil.fieldsWithoutNames(fieldMap.jordstykke, ['geom_json']),
      schema: jordstykkeJsonSchema(),
      mapper: function (baseUrl) {
        return function (value) {
          var result = {};
          result.ændret =  value.ændret;
          result.geo_version = value.geo_version;
          result.geo_ændret = value.geo_ændret;
          result.matrikelnr = value.matrikelnr;
          result.href = makeHref(baseUrl, 'jordstykke', [value.ejerlavkode, value.matrikelnr]);
          result.ejerlav = commonMappers.mapEjerlavRef(value.ejerlavkode, "", baseUrl);
          result.kommune = commonMappers.mapKode4NavnTema('kommune', value.kommunekode, '', baseUrl);
          result.region = commonMappers.mapKode4NavnTema('region', value.regionskode, '', baseUrl);
          result.sogn = commonMappers.mapKode4NavnTema('sogn', value.sognekode, '', baseUrl);
          result.retskreds = commonMappers.mapKode4NavnTema('retskreds', value.retskredskode, '', baseUrl);
          result.esrejendomsnr = value.esrejendomsnr ? ('' + value.esrejendomsnr) : null;
          result.sfeejendomsnr = value.sfeejendomsnr ? ('' + value.sfeejendomsnr) : null;
          return result;
        };
      }
    }
  }
};

// postnumre, zoner eksporteres ikke
_.filter(dagiTemaer, function(tema) {
  return tema.published;
}).forEach(function(tema) {
  var fields = fieldMap[tema.singular];
  var representations = {};
  var fieldsExcludedFromFlat = ['geom_json'];
  var flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);


  representations.flat = representationUtil.defaultFlatRepresentation(flatFields);
  function jsonSchema(additionalFields) {
    return schemaForFlatFields(tema, additionalFields, []);
  }
  function dagiTemaJsonMapper(keySpec, additionalFields) {
    var keyNames = _.pluck(keySpec, 'name');
    return function(baseUrl) {
      return function(row) {
        var result = {};
        additionalFields.forEach(function(fieldSpec) {
          result[fieldSpec.name] = fieldSpec.formatter(row[fieldSpec.name]);
        });

        result.ændret =  row.ændret;
        result.geo_version = row.geo_version;
        result.geo_ændret = row.geo_ændret;

        result.href = makeHrefFromPath(baseUrl, tema.plural, _.map(keyNames, function(keyName) { return result[keyName]; }));

        return result;
      };
    };
  }

  function dagiAutocompleteSchema() {
    var properties = {
      tekst: {
        description: autocompleteTekst[tema.singular].description(tema),
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
			    tekst: autocompleteTekst[tema.singular].mapper(row)
		    };
        result[tema.singular] = dagiTemaMapper(row);
        return result;
      };
    };
  }
  if(customRepresentations[tema.singular] && customRepresentations[tema.singular].json) {
    representations.json = customRepresentations[tema.singular].json;
  }
  else {
    representations.json = {
      // geomentry for the (huge) DAGI temaer is only returned in geojson format.
      fields: representationUtil.fieldsWithoutNames(fields, ['geom_json']),
      schema: globalSchemaObject(jsonSchema(additionalFields[tema.singular])),
      mapper: dagiTemaJsonMapper(tema.key, additionalFields[tema.singular])
    };
  }
  if(tema.searchable) {
    representations.autocomplete = {
      fields: representations.json.fields,
      schema: globalSchemaObject(dagiAutocompleteSchema()),
      mapper: dagiTemaAutocompleteMapper()
    };
  }
  representations.geojson = representationUtil.geojsonRepresentation(_.findWhere(fields, {name: 'geom_json'}), representations.flat);
  exports[tema.singular] = representations;

  registry.addMultiple(tema.singular, 'representation', module.exports[tema.singular]);
});
