"use strict";

var jsonRepresentations = require('./jsonRepresentations');

exports.adgangsadresse = {
  mapper: function (row, options) {
    var result= {};
    result.type = 'Feature';
    if(row.geom_json) {
      result.geometry = JSON.parse(row.geom_json);
    }
    result.crs = {
      type: 'name',
      properties: {
        name: 'EPSG:' + options.srid
      }
    };
    result.properties = jsonRepresentations.adgangsadresse.mapper(row, options);
    return result;
  }
};

exports.adresse = {
  mapper: function (row, options) {
    var result= {};
    result.type = 'Feature';
    if(row.geom_json) {
      result.geometry = JSON.parse(row.geom_json);
    }
    if(options.srid) {
      result.crs = {
        type: 'name',
        properties: {
          name: 'EPSG:' + options.srid
        }
      };
    }
    result.properties = jsonRepresentations.adresse.mapper(row, options);
    return result;
  }
};