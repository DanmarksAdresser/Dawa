"use strict";

const {go} = require('ts-csp');

var d = require('../../util').d;

module.exports = (client) => go(function*() {
  const rows = yield client.queryRows('SELECT MAX(sequence_number) as sekvensnummer, MAX(time) as tidspunkt FROM transaction_history');
  if (rows.length === 0) {
    return {
      sekvensnummer: 0,
      tidspunkt: null
    };
  }
  else {
    return {
      sekvensnummer: rows[0].sekvensnummer,
      tidspunkt: d(rows[0].tidspunkt)
    };
  }
});
