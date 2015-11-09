"use strict";

var commonMappers = require('../commonMappers');

var makeHref = commonMappers.makeHref;


function createResponseMapper(adgangsadresseOnly) {
  return function (baseUrl) {
    return function(row) {
      // we just set a href on the current address. The rest happens in sqlModel
      row.resultater.forEach((item) => {
        if(item.aktueladresse && (item.aktueladresse.status === 1 || item.aktueladresse.status === 3)) {
          item.aktueladresse.href = makeHref(
            baseUrl,
            adgangsadresseOnly ? 'adgangsadresse' : 'adresse',
            [item.aktueladresse.id]);
        }
      });
      return row;
    }
  }
}

['adgangsadresse', 'adresse'].forEach((entityName) => {
  exports[entityName] = {
    json: {
      fields: [],
      mapper: createResponseMapper(entityName === 'adgangsadresse')
    }
  };
});
