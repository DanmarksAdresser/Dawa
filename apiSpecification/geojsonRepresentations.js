"use strict";

var dagiTemaer = require('./dagiTemaer');
var csvRepresentations = require('./csvRepresentations');

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
    result.properties = csvRepresentations.adgangsadresse.mapper(row, options);
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
    result.properties = csvRepresentations.adresse.mapper(row, options);
    return result;
  }
};

exports.postnummer = {
  mapper: function(row, options) {
    var result = {};
    result.type = 'Feature';
    if (row.geom_json) {
      result.geometry = JSON.parse(row.geom_json);
    }
    if (options.srid) {
      result.crs = {
        type: 'name',
        properties: {
          name: 'EPSG:' + options.srid
        }
      };
    }
    result.properties = csvRepresentations.postnummer.mapper(row, options);
    return result;
  }
};

dagiTemaer.forEach(function (tema) {
  exports[tema.singular] = {mapper: function (row, options) {
    var result = {};
    result.type = 'Feature';
    if (row.geom_json) {
      result.geometry = JSON.parse(row.geom_json);
    }
    if (options.srid) {
      result.crs = {
        type: 'name',
        properties: {
          name: 'EPSG:' + options.srid
        }
      };
    }
    result.properties = csvRepresentations[tema.singular].mapper(row, options);
    return result;
  }
  };
});