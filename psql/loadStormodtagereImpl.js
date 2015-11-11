"use strict";

var csv       = require('csv');
var util      = require('util');
var q = require('q');
var _ = require('underscore');

function createInsertStormodtagereSQL(stormodtagere){
  return "INSERT INTO stormodtagere VALUES\n" +
    _.map(stormodtagere, function(sm){
      return util.format("  ('%s', '%s', '%s')",
        sm.Firmapostnr, sm.Bynavn, sm.Adgangsadresseid);
    }).join(",\n");
}

// When updating, first remove the old stormodtager data, then load
// the new data.  This way the CSV file completely controls which
// stormodtagere that exists. Note that the text-search-vector gets
// re-updated for every zip (the amount of zips is small, so this will
// be fast).
function updateStormodtagere(client, stormodtagere){
  return q.async(function*() {
    yield client.queryp('DELETE FROM stormodtagere');
    yield client.queryp(createInsertStormodtagereSQL(stormodtagere));
  })();
}

module.exports = function (client, inputFile) {
  // Read stormodtager data (this is a small CSV file, under 40 lines)
// and call the DB update function.
  return q.Promise((resolve, reject) =>
  {
    csv().from
      .path(inputFile, {delimiter: ';', columns: true})
      .to.array(function (data, count) {

        updateStormodtagere(client, _.filter(data, function (d) {
          return d.Adgangsadresseid !== "";
        })).then(resolve);
      });
  });
};
