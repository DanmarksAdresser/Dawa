"use strict";

const _ = require('underscore');

/*
 * Computes the list of fieldMap that should be included in the CSV representation for the given type
 */
exports.flatCandidateFields = function (fields) {
  return fields.filter(function (field) {
    return !field.multi && field.selectable;
  });
};

exports.fieldsWithNames = function (fields, names) {
  return _.filter(fields, function (field) {
    return _.contains(names, field.name);
  });
};

exports.fieldsWithoutNames = function (fields, names) {
  return _.reject(fields, function (field) {
    return _.contains(names, field.name);
  });
};

exports.defaultFlatMapper = function (flatFields) {
  return function (row) {

    return _.reduce(flatFields, function (memo, field) {
      var modelValue = row[field.name];
      var formattedValue;
      if (field.formatter) {
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

exports.defaultFlatRepresentation = function (fields) {
  var flatFields = exports.flatCandidateFields(fields);
  return {
    fields: flatFields,
    outputFields: _.pluck(flatFields, 'name'),
    mapper: function (baseUrl, params) {
      return exports.defaultFlatMapper(flatFields);
    }
  };
};



function removeZCoordinate(coordinates) {
  if(coordinates.length === 0) {
    return coordinates;
  }
  if(Array.isArray(coordinates[0])) {
    return coordinates.map(removeZCoordinate);
  }
  else if(coordinates.length === 3) {
    return coordinates.slice(0, 2);
  }
  return coordinates;
}




exports.geojsonRepresentation = function (geomJsonField, propertiesRepresentation) {
  return {
    fields: propertiesRepresentation.fields.concat([geomJsonField]),
    mapper: function (baseUrl, params, singleResult) {
      const propertiesMapper = propertiesRepresentation.mapper(baseUrl, params, singleResult);
      return function (row) {
        var result = {};
        result.type = 'Feature';
        if (row.geom_json) {
          result.geometry = JSON.parse(row.geom_json);
          if(params.format === 'geojson') {
            result.geometry.coordinates = removeZCoordinate(result.geometry.coordinates);
          }
        }
        else {
          result.geometry = null;
        }
        if (singleResult) {
          result.crs = {
            type: 'name',
            properties: {
              name: 'EPSG:' + (params.srid || 4326)
            }
          };
        }
        result.properties = propertiesMapper(row);
        if(result.properties.bbox) {
          result.bbox = result.properties.bbox;
          delete result.properties.bbox;
        }
        return result;
      };
    }
  };
};

const insertAfter = (arr, elm, ins) => {
  const index = arr.indexOf(elm) + 1;
  arr.splice(index, 0, ins);
}

exports.adresseFlatRepresentation = function (fields, additionalFieldsMapper) {
  var fieldsExcludedFromFlat = ['geom_json', 'x', 'y', 'vejpunkt_geom_json', 'adgangspunkt_geom_json'];
  var defaultFlatFields = exports.fieldsWithoutNames(exports.flatCandidateFields(fields), fieldsExcludedFromFlat);

  const requiredFlatFields = defaultFlatFields;

  let outputFlatFields = _.pluck(defaultFlatFields, 'name');

  // vi skal sikre, at nye felter tilføjes til sidst
  const newFields = ['jordstykke_ejerlavkode', 'jordstykke_matrikelnr', 'jordstykke_esrejendomsnr'];
  outputFlatFields = _.difference(outputFlatFields, newFields).concat(newFields);
  const kvhField = exports.fieldsWithNames(fields, ['kvh', 'kvhx']).map(field => field.name)[0];
  insertAfter(outputFlatFields, 'jordstykke_ejerlavnavn', kvhField);
  var defaultFlatMapper = exports.defaultFlatMapper(defaultFlatFields);

  return {
    fields: requiredFlatFields,
    outputFields: outputFlatFields,
    mapper: function () {
      return function (obj) {
        let result = defaultFlatMapper(obj);
        if (additionalFieldsMapper) {
          result = _.extend(result, additionalFieldsMapper(obj));
        }
        // result.zone = zoneFormatter(obj.zonekode);
        return result;
      };
    }
  };
};
