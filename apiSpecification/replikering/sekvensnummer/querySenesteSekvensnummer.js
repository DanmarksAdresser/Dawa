"use strict";


var d = require('../../util').d;

module.exports = function querySenesteSekvensnummer(client, callback) {
  return client.queryp('SELECT MAX(sequence_number) as sekvensnummer, MAX(time) as tidspunkt FROM transaction_history').then(function(result) {
    if(!result.rows) {
      return {
        sekvensnummer: 0,
        tidspunkt: null
      };
    }
    else {
      return {
        sekvensnummer: result.rows[0].sekvensnummer,
        tidspunkt: d(result.rows[0].tidspunkt)
      };
    }
  }).nodeify(callback);
};
