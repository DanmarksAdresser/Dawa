"use strict";

var _ = require('underscore');

var commonParameters = require('../common/commonParameters');
var schema = require('../parameterSchema');
var nameAndKey = require('./nameAndKey');
var normalizeParameter = require('../common/parametersUtil').normalizeParameter;
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../common/resourcesUtil');


var idParameters = _.map([
  {
    name: 'navn'
  }
], normalizeParameter);

var propertyFilterParameters = _.map([
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
], normalizeParameter);

module.exports = [
  // query
  resourcesUtil.queryResourceSpec(nameAndKey, {
      propertyFilter: propertyFilterParameters,
      search: commonParameters.search
    }, representations,
    sqlModel),
  resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: propertyFilterParameters,
    autocomplete: commonParameters.autocomplete
  }, representations.autocomplete, sqlModel),
  resourcesUtil.getByKeyResourceSpec(nameAndKey, idParameters, representations, sqlModel)
];

//module.exports = [
//  {
//    path: '/vejnavne/{kommunekode}/{vejkode}',
//    queryParameters: [
//
//    ],
//    pathParameters: {
//
//    },
//    representations: {
//      json: {
//        schema: undefined,
//        mapper: function(obj) {}
//      },
//      flat: {
//        schema: undefined,
//        mapper: function(obj) {}
//      },
//      geojson: {
//        schema: undefined,
//        mapper: function(obj) {}
//      },
//      autocomplete: {
//
//      }
//    },
//    handler: function(req, res) {
//
//    }
//  }
//];