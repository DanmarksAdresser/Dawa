"use strict";

var datamodels = require('../crud/datamodel');
var crud = require('../crud/crud');
var async = require('async');
var _ = require('underscore');


var allRenames = {
  vejnavn: {
    kode: 'vejkode',
    vejnavn: 'navn'
  }
};

function extractObjectFromSimpleEvent(eventData, datamodel, renames) {
  return _.reduce(datamodel.columns, function(memo, column) {
    memo[column] = eventData[renames[column] || column];
    return memo;
  }, {});
}

function performSqlQuery(sqlClient, event, datamodel, renames, callback) {
  var object = extractObjectFromSimpleEvent(event.data, datamodel, renames);
  switch (event.aendringstype) {
    case "oprettelse":
      crud.create(sqlClient, datamodel, object, callback);
      break;
    case 'aendring':
      crud.update(sqlClient, datamodel, object, callback);
      break;
    case 'nedlaeggelse':
      crud.delete(sqlClient, datamodel, object, callback);
      break;
    default:
      throw 'handleSimpleEvent with unknown event type, insufficient input validation?!';
  }
}

function handleSimpleEvent(sqlClient, event, callback) {
  var datamodel = datamodels[event.type];
  var renames = allRenames[event.type] || {};
  performSqlQuery(sqlClient, event, datamodel, renames, callback);
}

function parseHusnr(husnr) {
  var husnrRegex = /^([\d]{1,3})([A-Z]?)$/;
  var match = husnrRegex.exec(husnr);
  return {
    nr: parseInt(match[1]),
    bogstav: match[2] !== "" ? match[2] : null
  };
}
function compareHusnr(a, b) {
  var pa = parseHusnr(a);
  var pb = parseHusnr(b);
  if(pa.nr < pb.nr) {
    return -1;
  }
  if(pa.nr > pb.nr) {
    return 1;
  }
  if(pa.bogstav === pb.bogstav) {
    return 0;
  }
  if(!pa.bogstav && pb.bogstav) {
    return -1;
  }
  if(pa.bogstav && !pb.bogstav) {
    return 1;
  }
  if(pa.bogstav < pb.bogstav) {
    return -1;
  }
  else {
    return 1;
  }
}

function adresseWithinInterval(adgangsadresse, interval) {
  if(!adgangsadresse.husnr) {
    return false;
  }
  var husnr = parseHusnr(adgangsadresse.husnr);
  if((husnr.nr % 2 === 0) && interval.side === 'ulige') {
    return false;
  }
  else if((husnr.nr % 2 === 1) && interval.side === 'lige') {
    return false;
  }
  return compareHusnr(adgangsadresse.husnr, interval.husnrFra) >= 0 &&
    compareHusnr(adgangsadresse.husnr, interval.husnrTil) <= 0;
}

function createSupplerendebynavnUpdate(adgangsadresse, interval) {
  var supplerendebynavn = interval ? interval.navn : null;
  return {
    id: adgangsadresse.id,
    supplerendebynavn: supplerendebynavn
  };
}

function createPostnrUpdate(adgangsadresse, interval) {
  var postnr = interval ? interval.postnr : null;
  return {
    id: adgangsadresse.id,
    postnr: postnr
  };
}

function handleIntervalEvent(sqlClient, event, createUpdate, callback) {
  var data = event.data;
  var filter = {
    kommunekode: data.kommunekode,
    vejkode: data.vejkode
  };
  crud.query(sqlClient, datamodels.adgangsadresse, filter, function(err, adgangsadresser) {
    if(err) {
      return callback(err);
    }
    var updates = _.reduce(adgangsadresser, function(memo, adgangsadresse) {
      var interval = _.find(data.interval, function(interval) {
        return adresseWithinInterval(adgangsadresse, interval);
      });
      var update = createUpdate(adgangsadresse, interval);
      memo.push(update);
      return memo;
    }, []);
    async.eachSeries(updates, function(update, callback) {
      crud.update(sqlClient, datamodels.adgangsadresse, update, callback);
    }, callback);
  });
}

function handlePostnummerTilknytningEvent(sqlClient, event, callback) {
  return handleIntervalEvent(sqlClient, event, createPostnrUpdate, callback);
}

function handleSupplerendebynavnEvent(sqlClient, event, callback) {
  return handleIntervalEvent(sqlClient, event, createSupplerendebynavnUpdate, callback);
}
var eventHandlers = {
  adresse: handleSimpleEvent,
  adgangsadresse: handleSimpleEvent,
  vejnavn: function(sqlClient, event, callback) {
    return performSqlQuery(sqlClient,event,  datamodels.vejstykke, allRenames.vejnavn, callback);
  },
  postnummer: handleSimpleEvent,
  postnummertilknytning: handlePostnummerTilknytningEvent,
  supplerendebynavn: handleSupplerendebynavnEvent
};

module.exports = function(sqlClient, event, callback) {
  eventHandlers[event.type](sqlClient, event, callback);
};

// for testing purporses
module.exports.internal = {
  compareHusnr: compareHusnr,
  adresseWithinInterval: adresseWithinInterval
};