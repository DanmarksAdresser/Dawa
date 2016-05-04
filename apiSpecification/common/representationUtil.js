"use strict";

var dagiTemaer = require('../temaer/temaer');
var _ = require('underscore');

var kode4String = require('../util').kode4String;
var zoneFormatter = require('../util').zoneKodeFormatter;

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
        return result;
      };
    }
  };
};

exports.adresseFlatRepresentation = function (fields, additionalFieldsMapper) {
  var fieldsExcludedFromFlat = ['geom_json'];
  var defaultFlatFields = exports
    .fieldsWithoutNames(exports.flatCandidateFields(fields), fieldsExcludedFromFlat)
    .concat(exports.fieldsWithNames(fields, ['kvh', 'kvhx']));

  var requiredFlatFields = defaultFlatFields
    .concat(exports.fieldsWithNames(fields, ['temaer', 'kvh', 'kvhx']));

  var includedDagiTemaer = ['sogn', 'politikreds', 'retskreds', 'opstillingskreds'];
  var dagiTemaMap = _.indexBy(dagiTemaer, 'singular');
  var outputFlatFields = _.reduce(includedDagiTemaer, function (memo, temaNavn) {
    memo.push(dagiTemaMap[temaNavn].prefix + 'kode');
    memo.push(dagiTemaMap[temaNavn].prefix + 'navn');
    return memo;
  }, _.pluck(defaultFlatFields, 'name'));


  outputFlatFields.push('zone');

  outputFlatFields = outputFlatFields.concat(['jordstykke_ejerlavkode', 'jordstykke_matrikelnr', 'jordstykke_esrejendomsnr']);

  // vi skal sikre, at nye felter tilføjes til sidst

  var defaultFlatMapper = exports.defaultFlatMapper(defaultFlatFields);

  return {
    fields: requiredFlatFields,
    outputFields: outputFlatFields,
    mapper: function () {
      return function (obj) {
        var result = defaultFlatMapper(obj);
        if (additionalFieldsMapper) {
          result = _.extend(result, additionalFieldsMapper(obj));
        }
        includedDagiTemaer.forEach(function (temaNavn) {
          var tema = _.findWhere(obj.temaer, {tema: temaNavn});
          if (tema) {
            result[dagiTemaMap[temaNavn].prefix + 'kode'] = kode4String(tema.fields.kode);
            result[dagiTemaMap[temaNavn].prefix + 'navn'] = tema.fields.navn;
          }
        });
        var zoneTema = _.findWhere(obj.temaer, {tema: 'zone'});
        var zoneKode = zoneTema ? zoneTema.fields.zone : 2;
        result.zone = zoneFormatter(zoneKode);
        var jordstykke = _.findWhere(obj.temaer, {tema: 'jordstykke'});
        if (jordstykke) {
          result.jordstykke_ejerlavkode = jordstykke.fields.ejerlavkode;
          result.jordstykke_matrikelnr = jordstykke.fields.matrikelnr;
          result.jordstykke_esrejendomsnr = jordstykke.fields.esrejendomsnr ? "" + jordstykke.fields.esrejendomsnr : null;
        }

        return result;
      };
    }
  };
};
