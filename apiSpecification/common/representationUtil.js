"use strict";

var _ = require('underscore');

/*
 * Computes the list of fields that should be included in the CSV representation for the given type
 */
exports.flatCandidateFields = function(fields) {
  return fields.filter(function(field) {
    return !field.multi && field.selectable;
  });
};

exports.defaultFlatMapper = function(flatFields) {
  return function(row) {
    return _.reduce(flatFields, function(memo, field) {
      var modelValue = row[field.name];
      var formattedValue;
      if(field.formatter) {
        formattedValue = field.formatter(modelValue);
      }
      else {
        formattedValue = modelValue;
      }
      memo[field.name] = formattedValue;
      return memo;
    }, {});
  };
};

exports.geojsonRepresentation = function(geomJsonField, flatRepresentation) {
  return {
    fields: flatRepresentation.fields.concat([geomJsonField]),
    mapper: function(baseUrl, params, singleResult) {
      var flatMapper = flatRepresentation.mapper(baseUrl, params, singleResult);
      return function(row) {
        var result = {};
        result.type = 'Feature';
        if (row.geom_json) {
          result.geometry = JSON.parse(row.geom_json);
        }
        if (singleResult) {
          result.crs = {
            type: 'name',
            properties: {
              name: 'EPSG:' + (params.srid || 4326)
            }
          };
        }
        result.properties = flatMapper(row);
        return result;
      };
    }
  };
};