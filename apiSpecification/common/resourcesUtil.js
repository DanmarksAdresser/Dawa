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

function representationName(formatParam, strukturParam) {
  switch(formatParam) {
    case 'csv':
      if(strukturParam === 'mini') {
        return 'mini';
      }
      else {
        return 'flat';
      }
    case 'geojson':
    case 'geojsonz':
      if(strukturParam === 'nestet') {
        return 'geojsonNested';
      }
      else if(strukturParam === 'mini') {
        return 'geojsonMini';
      }
      else {
        return 'geojson';
      }
    case 'json':
      if(strukturParam === 'mini') {
        return 'mini';
      }
      else if(strukturParam === 'flad') {
        return 'flat';
      }
      else {
        return 'json';
      }
  }
}

exports.chooseRepresentationForQuery = function (formatParam, strukturParam, representations) {
  const name = representationName(formatParam, strukturParam);
  return representations[name];
};

exports.chooseRepresentationForAutocomplete = function(formatParam, strukturParam, representations) {
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

exports.flattenParameters = flattenParameters;

exports.queryResourcePathSpec = function(path, parameterGroups, representations, sqlModel) {
  const allParameters = _.extend({}, parameterGroups, {format: commonParameters.format, paging: commonParameters.paging });
  return {
    path: path,
    pathParameters: [],
    queryParameters: flattenParameters(allParameters),
    representations: representations,
    sqlModel: sqlModel,
    singleResult: false,
    chooseRepresentation: exports.chooseRepresentationForQuery,
    processParameters: exports.applyDefaultPagingForQuery
  };
};

exports.queryResourceSpec = function(nameAndKey, parameterGroups, representations, sqlModel) {
  return exports.queryResourcePathSpec(`/${nameAndKey.plural}`, parameterGroups, representations, sqlModel);
};


exports.autocompleteResourcePathSpec = function(path, parameters, autocompleteRepresentation, sqlModel) {
  const allParameters = _.extend({}, parameters, {format: commonParameters.format, paging: commonParameters.paging });
  return {
    path: path,
    pathParameters: [],
    queryParameters: flattenParameters(allParameters),
    representations: { autocomplete: autocompleteRepresentation },
    sqlModel: sqlModel,
    singleResult: false,
    chooseRepresentation: exports.chooseRepresentationForAutocomplete,
    processParameters: exports.applyDefaultPagingForAutocomplete
  };
};

exports.autocompleteResourceSpec = (nameAndKey, parameters, autocompleteRepresentation, sqlModel) =>
  exports.autocompleteResourcePathSpec('/' + nameAndKey.plural + '/autocomplete', parameters, autocompleteRepresentation, sqlModel);

exports.getByKeyResourceSpec = function(nameAndKey, idParameters, queryParameters, representations, sqlModel) {
  var path = _.reduce(nameAndKey.key, function(memo, key) {
    return memo + '/:' + key;
  }, '/' + nameAndKey.plural);
  return {
    path: path,
    pathParameters: idParameters,
    queryParameters: flattenParameters(_.extend({}, {format: commonParameters.format}, queryParameters)),
    representations: representations,
    sqlModel: sqlModel,
    singleResult: true,
    chooseRepresentation: exports.chooseRepresentationForQuery,
    processParameters:  function(params) { return; }
  };
};
exports.reverseGeocodingResourceSpec = function(path, representations, sqlModel, additionalParams) {
  const params = {
    format: commonParameters.format,
    crs: commonParameters.crs,
    reverseGeocoding: commonParameters.reverseGeocoding
  };
  if(representations.geojsonNested) {
    params.struktur = commonParameters.struktur;
  }
  if(additionalParams) {
    Object.assign(params, additionalParams);
  }
  return {
    path: path,
    pathParameters: [],
    queryParameters: exports.flattenParameters(params),
    representations: representations,
    sqlModel: sqlModel,
    singleResult: true,
    chooseRepresentation: exports.chooseRepresentationForQuery,
    processParameters:  function() {}
  };
};

exports.defaultResources = function(nameAndKey, idParameters, propertyFilterParameters, representations, sqlModel) {
  return [
    // query
    exports.queryResourceSpec(nameAndKey, {
        propertyFilter: propertyFilterParameters,
        search: commonParameters.search
      }, representations,
      sqlModel),
    exports.autocompleteResourceSpec(nameAndKey, {
      propertyFilter: propertyFilterParameters,
      autocomplete: commonParameters.autocomplete
    }, representations.autocomplete, sqlModel),
    exports.getByKeyResourceSpec(nameAndKey, idParameters, {}, representations, sqlModel)
  ];
};
