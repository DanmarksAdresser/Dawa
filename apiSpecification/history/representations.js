"use strict";

var fields = require('./fields');
var registry = require('../registry');
var representationUtil = require('../common/representationUtil');

['adgangsadresse', 'adresse'].forEach((entityName) => {
  var flat = representationUtil.defaultFlatRepresentation(fields[entityName]);
  var json = {
    fields: flat.fields,
    mapper: flat.mapper
  };
  exports[entityName] = {
    flat: flat,
    json: json
  };

  registry.addMultiple(`${entityName}_history`, 'representation', exports[entityName]);
});

