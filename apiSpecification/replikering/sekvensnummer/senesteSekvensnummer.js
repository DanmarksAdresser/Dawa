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
      querySenesteSekvensnummer(client, function(err, result) {
        done(err);
        if(err) {
          return resourceImpl.sendInternalServerError(res, "Fejl under udførelse af database query");
        }
        res.json(result);
      });
    });
  }
};

var registry = require('../../registry');

registry.add(null, 'resourceImpl','senesteSekvensnummer', module.exports);