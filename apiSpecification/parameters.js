"use strict";

var _ = require('underscore');
var columnsUtil = require('./columnsUtil');
var common = require('./commonParameterGroups');
var crsParameterSpec = common.crsParameterSpec;
var dagiTemaer = require('./dagiTemaer');
var dbapi = require('../dbapi');
var schema = require('./parameterSchema');
var sqlModels = require('./sql/sqlModels');
var winston = require('winston');

var autocompleteParameterSpec = common.autocompleteParameterSpec;
var geomWithinParameterSpec = common.geomWithinParameterSpec;
var reverseGeocodingParameterSpec = common.reverseGeocodingParameterSpec;
var searchParameterSpec = common.searchParameterSpec;
var dagiFilter = common.dagiFilter;

/**
 * Applies a list of property filter parameters to a query by generating the
 * appropriate where clauses.
 */
function applyParameters(spec, parameterSpec, params, query) {
  var sqlModel = sqlModels[spec.model.name];
  var columnSpec = sqlModel.columns;
  parameterSpec.forEach(function (parameter) {
    var name = parameter.name;
    var values = params[name];

    if (values !== undefined)
    {
      if (values.length === 1)
      {
        var value = values[0];
        var parameterAlias = dbapi.addSqlParameter(query, value);
        var column = columnsUtil.getColumnNameForWhere(columnSpec, name);
        query.whereClauses.push(column + " = " + parameterAlias);
      }
      else
      {
        var orClauses = _.map(values,
                              function(value){
                                var parameterAlias = dbapi.addSqlParameter(query, value);
                                var column = columnsUtil.getColumnNameForWhere(columnSpec, name);
                                return (column + " = " + parameterAlias);
                              });
        query.whereClauses.push("("+orClauses.join(" OR ")+")");
      }
    }
  });
}

function propertyFilterParameterGroup(parameters) {
  var result = {
    parameters: parameters
  };
  result.applySql = function(sqlParts, params, spec) {
    return applyParameters(spec, parameters, params, sqlParts);
  };
  return result;
}

exports.adgangsadresse = {
  propertyFilter: propertyFilterParameterGroup([
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid,
      multi: true
    },
    {
      name: 'vejkode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'vejnavn',
      multi: true
    },
    {
      name: 'husnr',
      multi: true
    },
    {
      name: 'supplerendebynavn',
      multi: true
    },
    {
      name: 'postnr',
      type: 'integer',
      schema: schema.postnr,
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'ejerlavkode',
      type: 'integer',
      multi: true
    },
    {
      name: 'matrikelnr',
      multi: true
    },
    {
      name: 'esrejendomsnr',
      type: 'integer',
      multi: true
    }
  ]),
  search: searchParameterSpec,
  autocomplete: autocompleteParameterSpec,
  crs: crsParameterSpec,
  geomWithin: geomWithinParameterSpec,
  reverseGeocoding: reverseGeocodingParameterSpec,
  dagiFilter: dagiFilter
};

exports.adresse = {
  propertyFilter: propertyFilterParameterGroup(exports.adgangsadresse.propertyFilter.parameters.concat([
    {
      name: 'etage',
      multi: true
    },
    {
      name: 'dør',
      multi: true
    },
    {
      name: 'adgangsadresseid',
      multi: true
    }
  ])),
  search: searchParameterSpec,
  autocomplete: autocompleteParameterSpec,
  crs: crsParameterSpec,
  geomWithin: geomWithinParameterSpec,
  dagiFilter: dagiFilter
};

exports.supplerendebynavn = {
  propertyFilter: propertyFilterParameterGroup([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'postnr',
      multi: true
    }
  ]),
  search: searchParameterSpec,
  autocomplete: autocompleteParameterSpec
};

exports.vejnavn = {
  propertyFilter: propertyFilterParameterGroup([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'postnr',
      type: 'integer',
      schema: schema.postnr,
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    }
  ]),
  search: searchParameterSpec,
  autocomplete: autocompleteParameterSpec
};

exports.vejstykke = {
  propertyFilter: propertyFilterParameterGroup([
    {
      name: 'kode',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'postnr',
      type: 'integer',
      schema: schema.postnr,
      multi: true
    }
  ]),
  search: searchParameterSpec,
  autocomplete: autocompleteParameterSpec
};

exports.postnummer = {
  propertyFilter: propertyFilterParameterGroup(
    [
      {
        name: 'nr',
        multi: true
      },
      {
        name: 'navn',
        multi: true
      },
      {
        name: 'kommune',
        multi: true
      }
    ]),
  search: searchParameterSpec,
  autocomplete: autocompleteParameterSpec
};

dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {
    propertyFilter: propertyFilterParameterGroup([
      {
        name: 'navn',
        multi: true
      },
      {
        name: 'kode',
        type: 'integer',
        multi: true
      }
    ]),
    search: searchParameterSpec,
    autocomplete: autocompleteParameterSpec
  };
});
