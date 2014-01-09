"use strict";

exports.getPostnummer = function(db, nr, callback) {
  db.collection('postnumre', function (err, collection) {
    if (err) {
      callback(err);
    }
    return collection.findOne({nr: nr}, callback);
  });
};

exports.putPostnummer = function(db, postnummer, callback) {
  db.collection('postnumre', function (err, collection) {
    if (err) {
      callback(err);
    }

    console.log("opretter postnummer" + JSON.stringify(postnummer));
    return collection.update({nr: postnummer.nr}, postnummer, { upsert: true }, callback);
  });
};
