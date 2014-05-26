"use strict";

var dbapi = require('../../../dbapi');

var d = require('../../util').d;
var resourceImpl = require('../../common/resourceImpl');

module.exports = {
  path: '/replikering/senestesekvensnummer',
  expressHandler: function(req, res) {
    dbapi.withReadonlyTransaction(function(err, client, done){
      if(err) {
        return resourceImpl.sendInternalServerError(res, "Kunne ikke forbinde til databasen");
      }
      client.query('SELECT MAX(sequence_number) as sekvensnummer, MAX(time) as tidspunkt FROM transaction_history', [], function(err, result) {
        done(err);
        if(err) {
          return resourceImpl.sendInternalServerError(res, "Fejl under udførelse af database query");
        }
        if(!result.rows) {
          return res.json({
            sekvensnummer: 0,
            tidspunkt: null
          });
        }
        return res.json({
          sekvensnummer: result.rows[0].sekvensnummer,
          tidspunkt: d(result.rows[0].tidspunkt)
        });
      });
    });
  }
};

var registry = require('../../registry');

registry.add(null, 'resourceImpl','senesteSekvensnummer', module.exports);