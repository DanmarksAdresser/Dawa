"use strict";

var _ = require('underscore');

function parseInteger(str) {
  return parseInt(str, 10);
}

// Describes how WFS features map to DAWA model

// we dont include danmark, because we do not need it, and we do not support themes without
// a key for each object (yet)
//exports.danmark = {
//  name: 'danmark',
//  wfsName: 'Danmark',
//  fieldMap: {}
//};


exports.valglandsdel = {
	name: 'valglandsdel',
	wfsName: 'Valglandsdel',
	geometry: 'geometri',
	fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
		navn: 'navn',
		bogstav: 'valglandsdelsbogstav'
	}
};

exports.storkreds = {
  name: 'storkreds',
  wfsName: 'Storkreds',
  geometry: 'geometri',
  fields: {
    dagi_id: {
      name: 'DAGIid',
      parseFn: parseInteger
    },
    navn: 'navn',
    nummer: {
      name: 'storkredsnummer',
      parseFn: parseInteger
    }
  }
};


// normalize, such that every field has a name and a parseFn and a filterFn.
_.each(exports, function(mapping) {
  mapping.fields = _.reduce(mapping.fields, function(memo, value, key) {
    if(_.isObject(value)) {
      memo[key] = value;
    }
    else {
      memo[key] = {
        name: value,
        parseFn: _.identity
      };
    }
    return memo;
  }, {});
  mapping.filterFn = mapping.filterFn || function() { return true; };
});