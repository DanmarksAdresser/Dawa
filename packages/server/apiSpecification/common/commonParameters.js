"use strict";

var _ = require('underscore');
var schema = require('../parameterSchema');

exports.paging = [
  {
    name: 'side',
    type: 'integer',
    schema: schema.positiveInteger,
    validateFun: function(sideParam, params) {
      var PAGING_LIMIT = 25000;
      if(sideParam > 1 && params.per_side * sideParam > PAGING_LIMIT) {
        throw "Der kan højst pagineres i de første " + PAGING_LIMIT +" elementer";
      }
    }
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
      "enum": ['csv', 'json', 'geojson', 'geojsonz']
    }
  },
  {
    name: 'callback',
    schema: {
      type: 'string',
      pattern: '^[\\$_a-zA-Z0-9\\.]+$'
    }
  },
  {
    name: 'noformat'
  },
  {
    name: 'ndjson'
  }
];

exports.struktur= [
  {
    name: 'struktur',
    schema: {
      enum: ['flad', 'nestet', 'mini']
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

exports.fuzzy = [
  {
    name: 'fuzzy',
    type: 'boolean'
  }
];

exports.crs = [
  {
    name: 'srid',
    type: 'integer',
    schema: {
      enum: [4326, 25832]
    }
  }
];

var GEOM_BOUNDS = {
  "4326": {
    x: [0, 25],
    y: [45, 65]
  },
  "25832": {
    x: [0, 1500000],
    y:  [5000000, 7500000]
  }
};


const validate2dPoint = (srid, pair) => {
  if (! (_.isArray(pair) && pair.length === 2 && _.isNumber(pair[0]) && _.isNumber(pair[1]))) {
    throw 'A point must consist of coordinate pairs of numbers: '+JSON.stringify(pair);
  }
  validateXParam(pair[0], srid);
  validateYParam(pair[1], srid);

};
const validateLinearRing = (srid, linearRing) => {
  if(!_.isArray(linearRing) || linearRing.length < 4) {
    throw 'Every LinearRing in polygon coordinates must contain at least four coordinate pairs: '+JSON.stringify(linearRing);
  }
  // Ensure polygons consists of number-pairs
  _.each(linearRing, function(pair){
    validate2dPoint(srid, pair);
  });
  // Ensure closed polygons
  const first = _.first(linearRing);
  const last  = _.last (linearRing);
  if (!(first[0] === last[0] && first[1] === last[1])) {
    throw 'Polygon cannot be open, first and last element must be equal: '+JSON.stringify(linearRing);
  }
};

exports.geomWithin = [
  {
    name: 'polygon',
    type: 'json',
    schema: schema.polygon,
    maxLength: 2000,
    validateFun: function(polygon, params) {
      if(!_.isArray(polygon) || polygon.length === 0) {
        throw 'Polygon must be an array of arrays of coordinate pairs: '+JSON.stringify(polygon);
      }
      for(let linearRing of polygon) {
        validateLinearRing(params.srid, linearRing);
      }
    }
  },
  {
    name: 'cirkel',
    type: 'string',
    schema: {
      type: 'string',
      pattern: '^((\\+|\\-)?[0-9]+(\\.[0-9]*)?),((\\+|\\-)?[0-9]+(\\.[0-9]*)?),((\\+|\\-)?[0-9]+(\\.[0-9]*)?)$'
    },
    validateFun: function(param, params) {
      const args = params.cirkel.split(',');
      const x = parseFloat(args[0]);
      const y = parseFloat(args[1]);
      const diam = parseFloat(args[2]);
      validateXParam(x, params.srid);
      validateYParam(y, params.srid);
      if(diam <= 0) {
        throw 'Cirkel radius skal være større end 0';
      }
    }
  }
];

function validateXParam(x, sridParam) {
  const srid = "" + (sridParam || 4326);
  const bounds = GEOM_BOUNDS[srid];
  if(!bounds) {
    return;
  }
  if(x < bounds.x[0] || x > bounds.x[1]) {
    throw "X coordinate not within allowed bounds: " + JSON.stringify({
      x: x,
      xmin: bounds.x[0],
      xmax: bounds.x[1],
      srid: srid
    });
  }
}
function validateYParam(y, sridParam) {
  const srid = "" + (sridParam || 4326);
  const bounds = GEOM_BOUNDS[srid];
  if(!bounds) {
    return;
  }
  if(y < bounds.y[0] || y > bounds.y[1]) {
    throw "Y coordinate not within allowed bounds: " + JSON.stringify({
      y: y,
      ymin: bounds.y[0],
      ymax: bounds.y[1],
      srid: srid
    });
  }
}

exports.reverseGeocoding =
  [
    {
      name: 'x',
      type: 'float',
      required: true,
      validateFun: function(x, params) {
        return validateXParam(x, params.srid);
      }
    },
    {
      name: 'y',
      type: 'float',
      required: true,
      validateFun: function(y, params) {
        return validateYParam(y, params.srid);
      }
    }
  ];

exports.reverseGeocodingOptional =
  [
    {
      name: 'x',
      type: 'float',
      validateFun: function(x, params) {
        validateXParam(x, params.srid);
        if(params.y === undefined || params.y === null) {
          throw new Error('When supplying an x param for reverse geocoding, a y param is required as well.');
        }
      }
    },
    {
      name: 'y',
      type: 'float',
      validateFun: function(y, params) {
        validateYParam(y, params.srid);
        if(params.x === undefined || params.x === null) {
          throw new Error('When supplying a y param for reverse geocoding, an x param is required as well.');
        }
      }
    }
  ];

exports.reverseGeocodingNearest = [{
  name: 'nærmeste',
  type: 'boolean',
  renameTo: 'reverseGeocodingNearest'
}];

exports.includeDeleted = [{
  name: 'medtagnedlagte',
  type: 'boolean'
}];

