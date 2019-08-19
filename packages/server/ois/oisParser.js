"use strict";

const through2 = require('through2');
const rawXmlStream = require('../ois-common/rawXmlStreamExpat');
var fieldParsers = require('./fieldParsers');


// Parse an OIS XML file into a stream of javascript objects
exports.oisStream = function(sourceStream, oisModel) {
  var xmlStream = rawXmlStream(sourceStream, oisModel.oisTable);
  const transformer =
    through2.obj(function (rawObject, enc, callback) {
      const result = oisModel.fields.reduce(function(memo, field) {
        var rawValue = rawObject[field.name];
        var parsedValue;
        try {
          parsedValue = fieldParsers[field.oisType](rawValue);
        }
        catch(e) {
          throw new Error('Field ' + field.name + ' contained invalid value ' + rawValue + '. Object: ' + JSON.stringify(rawObject));
        }
        memo[field.name] = parsedValue;
        return memo;
      }, {});

      for(let derivedField of oisModel.derivedFields) {
        result[derivedField.name] = derivedField.compute(result);
      }
      // Filter OIS objects with missing key
      if(result[oisModel.key[0]] !== null) {
        this.push(result);
      }
      callback();
  });
  return xmlStream.pipe(transformer);
};

exports.internal = {
  rawXmlStream: rawXmlStream
};
