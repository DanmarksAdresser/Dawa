"use strict";

var _ = require('underscore');

var commonParameters = require('./commonParameters');
/**
 * By default, if per_side is specified, side defaults to 1.
 * If side is specified, per_side defaults to 20.
 */
exports.applyDefaultPagingForQuery = function(params) {
  if(params.per_side && !params.side) {
    params.side = 1;
  }
  if(params.side && !params.per_side) {
    params.per_side = 20;
  }
};

exports.applyDefaultPagingForAutocomplete = function(params) {
  if(!params.per_side) {
    params.per_side = 20;
  }
  if(!params.side) {
    params.side = 1;
  }
};

exports.chooseRepresentationForQuery = function (formatParam, representations) {
  var representationName = formatParam === 'csv' ? 'flat' : formatParam;
  var representation = representations[representationName];
  return representation;
};

exports.chooseRepresentationForAutocomplete = function(formatParam, representations) {
  if((formatParam || 'json') === 'json') {
    return representations.autocomplete;
  }
  return null;
};


function flattenParameters(parameterGroups) {
  return _.reduce(parameterGroups, function(memo, parameterGroup){
    return memo.concat(parameterGroup);
  }, []);
}


exports.queryResourceSpec = function(nameAndKey, parameterGroups, representations, sqlModel) {
  var allParameters = _.extend({}, parameterGroups, {format: commonParameters.format, paging: commonParameters.paging });
  return {
    path: '/' + nameAndKey.plural,
    pathParameters: [],
    queryParameters: flattenParameters(allParameters),
    representations: representations,
    sqlModel: sqlModel,
    singleResult: false,
    chooseRepresentation: exports.chooseRepresentationForQuery,
    processParameters: exports.applyDefaultPagingForQuery
  };
};

exports.autocompleteResourceSpec = function(nameAndKey, parameters, autocompleteRepresentation, sqlModel) {
  var allParameters = _.extend({}, parameters, {format: commonParameters.format, paging: commonParameters.paging });
  return {
    path: '/' + nameAndKey.plural + '/autocomplete',
    pathParameters: {},
    queryParameters: flattenParameters(allParameters),
    representations: { autocomplete: autocompleteRepresentation },
    sqlModel: sqlModel,
    singleResult: false,
    chooseRepresentation: exports.chooseRepresentationForAutocomplete,
    processParameters: exports.applyDefaultPagingForAutocomplete
  };
};

exports.getByKeyResourceSpec = function(nameAndKey, idParameters, representations, sqlModel) {
  var path = _.reduce(nameAndKey.key, function(memo, key) {
    return memo + '/:' + key;
  }, '/' + nameAndKey.plural);
  return {
    path: path,
    pathParameters: idParameters,
    queryParameters: commonParameters.format,
    representations: representations,
    sqlModel: sqlModel,
    singleResult: true,
    chooseRepresentation: exports.chooseRepresentationForQuery,
    processParameters:  function(params) {
      // the id parameters are not multi parameters, but
      // the sql layer expects them to be, because the same parameters
      // are also used for filtering
      nameAndKey.key.forEach(function(keyPart) {
        params[keyPart] = [params[keyPart]];
      });
    }
  };
};