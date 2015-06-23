"use strict";

var _ = require('underscore');

var aboutOis = require('./aboutOis');

var specs = [
  {
    name: 'bygning',
    key: ['ois_id'],
    table: 'ois_bygning'
  }
];


module.exports= specs.reduce(function(memo, spec) {
  var datamodel = _.clone(spec);
  var entityName = spec.name;
  datamodel.columns = _.pluck(aboutOis[entityName].fields, 'name');
  memo[entityName] = datamodel;
  return memo;
}, {});