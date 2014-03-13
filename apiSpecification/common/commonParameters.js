"use strict";

var _ = require('underscore');
var schema = require('../parameterSchema');

var dagiTemaer = require('../dagitemaer/dagiTemaer');
exports.paging = [
  {
    name: 'side',
    type: 'integer',
    schema: schema.positiveInteger
  },
  {
    name: 'per_side',
    type: 'integer',
    schema: schema.positiveInteger
  }
];

exports.format = [
  {
    name: 'format',
    schema: {
      "enum": ['csv', 'json', 'geojson']
    }
  },
  {
    name: 'callback',
    schema: {
      type: 'string',
      pattern: '^[\\$_a-zA-Z0-9]+$'
    }
  }
];

exports.search = [
  {
    name: 'q',
    type: 'string',
    renameTo: 'search'
  }
];

exports.autocomplete = [
  {
    name: 'q',
    type: 'string',
    renameTo: 'autocomplete'
  }
];

exports.crs = [
  {
    name: 'srid',
    type: 'integer'
  }
];

exports.geomWithin = [
  {
    name: 'polygon',
    type: 'json',
    schema: schema.polygon,
    validateFun: function(polygon){
      if(!_.isArray(polygon) || polygon.length === 0) {
        throw 'Polygon must be an array of arrays of coordinate pairs: '+JSON.stringify(polygon);
      }
      _.each(polygon, function(linearRing){
        if(!_.isArray(linearRing) || linearRing.length < 2) {
          throw 'Every LinearRing in polygon coordinates must contain at least two coordinate pairs: '+JSON.stringify(linearRing);
        }
        // Ensure polygons consists of number-pairs
        _.each(linearRing, function(pair){
          if (! (_.isArray(pair) && pair.length === 2 && _.isNumber(pair[0]) && _.isNumber(pair[1]))) {
            throw 'Polygon must consist of coordinate pairs of numbers: '+JSON.stringify(linearRing);
          }
        });
        // Ensure closed polygons
        var first = _.first(linearRing);
        var last  = _.last (linearRing);
        if (! (first[0] === last[0] && first[1] === last[1])) {
          throw 'Polygon cannot be open, first and last element must be equal: '+JSON.stringify(linearRing);
        }
      });
    }
  },
  {
    name: 'cirkel',
    type: 'string',
    schema:{
      type: 'string',
      pattern: '^((\\+|\\-)?[0-9]+(\\.[0-9]*)?),((\\+|\\-)?[0-9]+(\\.[0-9]*)?),((\\+|\\-)?[0-9]+(\\.[0-9]*)?)$'
    }
  }
];
exports.reverseGeocoding =
  [
    {
      name: 'x',
      type: 'float'
    },
    {
      name: 'y',
      type: 'float'
    }
  ];

var filterableDagiSkemaer = ['region', 'opstillingskreds', 'politikreds', 'sogn', 'retskreds'];

var dagiTemaMap = _.indexBy(dagiTemaer, 'singular');
exports.dagiFilter = _.map(filterableDagiSkemaer, function(skemaNavn) {
  return {
    name: dagiTemaMap[skemaNavn].prefix + 'kode',
    type: 'integer',
    schema: schema.kode4,
    multi: true
  };
});
