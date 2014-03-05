"use strict";

var ZSchema     = require("z-schema");
var _           = require('underscore');

/******************************************************************************/
/*** Parameter parsing and validation *****************************************/
/******************************************************************************/

exports.parseParameters = function(params, parameterSpec, resourceSpec) {
  var paramNames = _.filter(_.keys(params), function(name) {
    return parameterSpec[name] ? true : false;
  });
  return _.reduce(paramNames,
    function(memo, name){
      try{
        var val = parseParameter(params[name], parameterSpec[name], resourceSpec);
        memo.params[name] = val;
      } catch(error){
        memo.errors.push([name, error]);
      }
      return memo;
    },
    {params: {}, errors: []});
};

function parseParameter(valString, paramSpec, resourceSpec) {
  var val = parseParameterType(valString, paramSpec.type);
  jsonSchemaValidation(val, paramSpec.schema);
  if (paramSpec.validateFun) { paramSpec.validateFun(val, resourceSpec); }
  return val;
}

function parseParameterType(valString, type) {
  if (type === undefined || type === 'string') {
    return valString;
  }
  if(type === 'integer') {
    if(!/^[0-9]+$/.test(valString)) {
      throw 'notInteger';
    }
    return parseInt(valString, 10);
  }
  if(type === 'float') {
    if(!/^(\-|\+)?[0-9]+(\.[0-9]+)?$/.test(valString)) {
      throw 'notFloat';
    }
    return parseFloat(valString);
  }
  if(type === 'json') {
    try {
      return JSON.parse(valString);
    }
    catch(error) {
      throw 'notJson';
    }
  }
  throw 'Internal error: Invalid type ' + type + ' specified for parameter';
}

function jsonSchemaValidation(val, schema){
  if (schema){
    try{
      zsValidate(val, schema);
    }
    catch(error){
      throw error.errors[0].message;
    }
  }
}

var validator = new ZSchema({ sync: true });
function zsValidate(json, schema){
  var valid = validator.validate(json, schema);
  if (!valid) {
    throw validator.getLastError();
  } else {
    return true;
  }
}
