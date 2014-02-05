"use strict";

var ZSchema     = require("z-schema");
var _           = require('underscore');

/******************************************************************************/
/*** Parameter parsing and validation *****************************************/
/******************************************************************************/

exports.parseParameters = function(params, parameterSpec) {
  var paramNames = _.filter(_.keys(params), function(name) {
    return parameterSpec[name] ? true : false;
  });
  return _.reduce(paramNames,
    function(memo, name){
      try{
        var val = parseParameter(params[name], parameterSpec[name]);
        memo.params[name] = val;
      } catch(error){
        memo.errors.push([name, error]);
      }
      return memo;
    },
    {params: {}, errors: []});
};

function parseParameter(valString, spec) {
  var val = parseParameterType(valString, spec.type);
  jsonSchemaValidation(val, spec.schema);
  return spec.transform ? spec.transform(val) : val;
}
function parseParameterType(valString, type) {
  if (type === undefined){
    return valString;
  } else {
    var val;
    try {
      val = JSON.parse(valString);
    }
    catch(error){
      // When JSON parsing fails, just assume it is a string.
      val = valString;
    }
    if(type === 'string'){
      if (_.isString(val)) return val; else throw "notString";
    } else if(type === 'number'){
      if (_.isNumber(val)) return val; else throw "notNumber";
    } else if(type === 'array'){
      if (_.isArray(val)) return val; else throw "notArray";
    } else if(type === 'object'){
      if (_.isObject(val) && !_.isArray(val)) return val; else throw "notObject";
    }
    else {
      throw "unknownType";
    }
  }
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
