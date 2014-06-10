"use strict";

var d = require('../../util').d;

module.exports = function querySenesteSekvensnummer(client, callback) {
  client.query('SELECT MAX(sequence_number) as sekvensnummer, MAX(time) as tidspunkt FROM transaction_history', [], function(err, result) {
    if(err) {
      return callback(err);
    }
    if(!result.rows) {
      callback(null, {
        sekvensnummer: 0,
        tidspunkt: null
      });
    }
    else {
      callback(null, {
        sekvensnummer: result.rows[0].sekvensnummer,
        tidspunkt: d(result.rows[0].tidspunkt)
      });
    }
  });
};
