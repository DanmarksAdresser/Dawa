"use strict";

var commonMappers = require('../commonMappers');
var fieldsMap = require('./fields');
var representationUtil = require('../common/representationUtil');


var makeHref = commonMappers.makeHref;


function createResponseMapper(adgangsadresseOnly) {
  return function (baseUrl) {
    return function(row) {
      row.resultater.forEach((item) => {
        item.aktueladresse.href = makeHref(
          baseUrl,
          adgangsadresseOnly ? 'adgangsadresse' : 'adresse',
          [item.aktueladresse.id]);
      });
      return row;
    }
  }
}

['adgangsadresse', 'adresse'].forEach((entityName) => {
  let fields = fieldsMap[entityName];
  let flatFields = representationUtil.flatCandidateFields(fields);
  exports[entityName] = {
    json: {
      fields: flatFields,
      mapper: createResponseMapper(entityName === 'adgangsadresse')
    }
  };
});
