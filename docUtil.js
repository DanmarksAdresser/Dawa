"use strict";

var _ = require('underscore');
var apiSpecUtil = require('./apiSpecUtil');

module.exports = {
  computeGetUrlTemplate: function(baseUrl, spec) {
    return baseUrl + '/' + spec.model.plural + _.map(apiSpecUtil.getKeyForSelect(spec), function(keyPart) {
      return '/{' + keyPart + '}';
    }).join('');
  },
  computeGetParameters: function(apiSpec, docSpec) {
    var parameterNames = apiSpecUtil.getKeyForSelect(apiSpec);
    return _.map(parameterNames, function(parameterName) {
      return _.findWhere(docSpec.parameters, {name: parameterName});
    });
  },
  computeQueryUrl: function(baseUrl, spec, query) {
    var url = baseUrl + '/' + spec.model.plural;
    if(!_.isEmpty(query)) {
      url += '?' + _.map(query, function(param) {
        return encodeURIComponent(param.name) + '=' + encodeURIComponent(param.value);
      }).join('&');
    }
    return url;
  },
  computeGetUrl: function(baseUrl, spec, path) {
    var url = baseUrl + '/' + spec.model.plural + '/';
    url += _.map(path, encodeURIComponent).join('/');
    return url;
  }
};
