"use strict";

const _ = require('underscore');
const commonMappers = require('../commonMappers');
const { globalSchemaObject } = require('../commonSchemaDefinitionsUtil');

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
    const result = _.reduce(flatFields, function (memo, field) {
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
    return result;
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

exports.miniRepresentation = (miniFieldNames, allFields, miniSchema, hrefFormatter, betegnelseFormatter) =>{
  const miniFieldNamesSet = new Set(miniFieldNames);
  const allFieldNamesSet = new Set(allFields.map(field => field.name));
  if(allFieldNamesSet.has('visueltcenter_x')) {
    miniFieldNamesSet.add('visueltcenter_x');
    miniFieldNamesSet.add('visueltcenter_y');
    if(miniSchema) {
      miniSchema.properties.visueltcenter_x = {
        type: ['number', 'null'],
        description: 'x-koordinat for det visuelle center. Kan f.eks. anvendes til at placere en label på et kort. Koordinatsystem styres med srid parameteren.'
      };
      miniSchema.properties.visueltcenter_y = {
        type: ['number', 'null'],
        description: 'y-koordinat for det visuelle center.'
      };
      miniSchema.docOrder.push('visueltcenter_x');
      miniSchema.docOrder.push('visueltcenter_y');
    }
  }
  const miniFields = allFields.filter(field => miniFieldNamesSet.has(field.name));
  const outputFields = [...miniFields.map(field => field.name), 'href', 'betegnelse'];
  return {
    fields: miniFields,
    outputFields,
    schema: miniSchema,
    mapper: function (baseUrl, params) {
      const flatMapper = exports.defaultFlatMapper(miniFields.filter(field => !field.multi));
      return row => {
        const result = flatMapper(row);
        result.href = hrefFormatter(baseUrl, row);
        result.betegnelse = betegnelseFormatter(row);
        return result;
      }
    }
  };
} ;

exports.autocompleteRepresentation = (miniRepresentation, dataPropertyName) => {
  const miniSchema = {
    type: 'object',
    properties: JSON.parse(JSON.stringify(miniRepresentation.schema.properties))
  };
  const schema = {
    properties: {
      tekst: miniSchema.properties.betegnelse
    },
    docOrder: ['tekst', dataPropertyName]
  };
  delete miniSchema.properties.tekst;
  schema.properties[dataPropertyName] = miniSchema;
  schema.properties[dataPropertyName].docOrder =
   _.without(schema.properties[dataPropertyName].docOrder, 'betegnelse');
  return {
    fields: miniRepresentation.fields,
    schema: globalSchemaObject(schema),
    mapper: (baseUrl, params) => {
      const miniMapper = miniRepresentation.mapper(baseUrl, params);
      return row => {
        const miniResult = miniMapper(row);
        const result = {
          tekst: miniResult.betegnelse
        };
        delete miniResult.betegnelse;
        result[dataPropertyName] = miniResult;
        return result;
      };
    }
  }
};


function removeZCoordinate(coordinates) {
  if(coordinates.length === 0) {
    return coordinates;
  }
  if(Array.isArray(coordinates[0])) {
    return coordinates.map(removeZCoordinate).filter((coords, index, arr) => {
      if(index === arr.length -1) {
        return true;
      }
      const nextCoords = arr[index+1];
      return coords[0] !== nextCoords[0] || coords[1] !== nextCoords[1];
    });
  }
  else if(coordinates.length === 3) {
    return coordinates.slice(0, 2);
  }
  return coordinates;
}

exports.removeZCoordinate = removeZCoordinate;

exports.geojsonRepresentation = function (geomJsonField, propertiesRepresentation) {
  return {
    fields: propertiesRepresentation.fields.concat([geomJsonField]),
    mapper: function (baseUrl, params, singleResult) {
      const propertiesMapper = propertiesRepresentation.mapper(baseUrl, params, singleResult);
      return function (row) {
        var result = {};
        result.type = 'Feature';
        if (row[geomJsonField.name]) {
          result.geometry = JSON.parse(row[geomJsonField.name]);
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
        if(result.properties.bbox_xmin) {
          result.bbox = commonMappers.mapBbox(result.properties);
          delete result.properties.bbox_xmin;
          delete result.properties.bbox_ymin;
          delete result.properties.bbox_xmax;
          delete result.properties.bbox_ymax;
        }
        return result;
      };
    }
  };
};

const addGeojsonRepresentations = (representations, geomjsonField) => {
  for(let [geojsonKey, repKey] of [['geojsonNested', 'json'], ['geojsonMini', 'mini'], ['geojson', 'flat']]) {
    if(representations[repKey]) {
      representations[geojsonKey] = exports.geojsonRepresentation(geomjsonField, representations[repKey]);
    }
  }
};

exports.addGeojsonRepresentations = addGeojsonRepresentations;

const insertAfter = (arr, elm, ins) => {
  const index = arr.indexOf(elm) + 1;
  arr.splice(index, 0, ins);
};


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
