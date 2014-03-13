"use strict";

var _ = require('underscore');

exports.normalizeParameter = function(param) {
  param.type = param.type || 'string';
  if(_.isUndefined(param.multi)) {
    param.multi = false;
  }
  return param;
};

exports.normalizeParameters = function(params) {
  params.forEach(function(param) {
    exports.normalizeParameter(param);
  });
  return params;
};