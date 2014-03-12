"use strict";

var _ = require('underscore');

var dagiTemaer = require('./dagiTemaer');
var fields = require('./fields');
var fieldsUtil = require('./fieldsUtil');

/*
 * A csv model is simply the list of fields to include in the CSV representation.
 */

var excludedFields = {
  vejstykke: [],
  vejnavn: [],
  supplerendebynavn: [],
  postnummer: ['geom_json'],
  adgangsadresse: ['geom_json'],
  adresse: ['geom_json']
};

dagiTemaer.forEach(function(tema) {
  excludedFields[tema.singular] = ['geom_json'];
});

/**
 * The resource types below simply uses a standard CSV mapping, in which all non-multi fields not excluded above is
 * returned.
 */
var resourceTypesWithDefaultCsvMapping = ['vejstykke', 'vejnavn', 'supplerendebynavn', 'postnummer'].concat(_.pluck(dagiTemaer, 'singular'));

/*
 * Computes the list of fields that should be included in the CSV representation for the given type
 */
function csvCandidateFields(typeName) {
  var allSelectableFields = fieldsUtil.allSelectableFields(typeName);
  return _.pluck(allSelectableFields.filter(function(field) {
    return _.isUndefined(field.multi) || !field.multi;
  }), 'name');
}

var defaultCsvMapper = function(csvFieldNames, fieldSpec) {
  var fieldMap = _.indexBy(fieldSpec, 'name');
  return function(row) {
    return _.reduce(csvFieldNames, function(memo, fieldName) {
      var field = fieldMap[fieldName];
      var modelValue = row[fieldName];
      var formattedValue;
      if(field.formatter) {
        formattedValue = field.formatter(modelValue);
      }
      else {
        formattedValue = modelValue;
      }
      memo[fieldName] = formattedValue;
      return memo;
    }, {});
  };
};

/*
 * Create all the CSV representations using the default mapping
 */
_.forEach(resourceTypesWithDefaultCsvMapping, function(resourceTypeName) {
  var fieldList = _.difference(csvCandidateFields(resourceTypeName), excludedFields[resourceTypeName]);
  exports[resourceTypeName] = {
    requiredFields: fieldList,
    csvFields: fieldList,
    mapper: defaultCsvMapper(fieldList, fields[resourceTypeName])
  };
});

/*
 * Adresser and adgangsadresser are different, because the include a flattened version of the
 * dagiTemaer, which is a multi field.
 */
['adgangsadresse', 'adresse'].forEach(function(resourceTypeName) {
  var defaultFields = _.difference(csvCandidateFields(resourceTypeName), excludedFields[resourceTypeName]);
  var fieldList = defaultFields.concat(['dagitemaer']);
  var includedDagiTemaer = ['region', 'sogn', 'politikreds', 'retskreds','opstillingskreds'];
  var dagiTemaMap = _.indexBy(dagiTemaer,'singular');
  var csvFields = _.reduce(includedDagiTemaer, function(memo, temaNavn) {
    memo.push(dagiTemaMap[temaNavn].prefix + 'kode');
    memo.push(dagiTemaMap[temaNavn].prefix + 'navn');
    return memo;
  }, _.clone(defaultFields));
  var defaultMapper = defaultCsvMapper(defaultFields, fields[resourceTypeName]);
  exports[resourceTypeName] = {
    requiredFields: fieldList,
    csvFields: csvFields,
    mapper: function(obj) {
      var result = defaultMapper(obj);
      includedDagiTemaer.forEach(function(temaNavn) {
        var tema = _.findWhere(obj.dagitemaer, { tema: temaNavn});
        if(tema) {
          result[dagiTemaMap[temaNavn].prefix + 'kode'] = tema.kode;
          result[dagiTemaMap[temaNavn].prefix + 'navn'] = tema.navn;
        }
      });
      return result;
    }
  };
});