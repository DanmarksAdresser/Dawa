"use strict";

var fields = require('./fields');
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
});
