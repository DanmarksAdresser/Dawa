"use strict";

var async = require('async');
var winston = require('winston');
var ZSchema = require("z-schema");
var _ = require('underscore');

var bbrEventsLogger = require('../../logger').forCategory('bbrEvents');
var crud = require('../../crud/crud');
var datamodels = require('../../crud/datamodel');
var eventSchemas = require('../common/eventSchemas');

function getDatamodel(eventType) {
  if(eventType === 'enhedsadresse') {
    return datamodels.adresse;
  }
  else {
    return datamodels[eventType];
  }
}

var allRenames = {
  vejnavn: {
    kode: 'vejkode',
    vejnavn: 'navn'
  },
  adgangsadresse: {
    husnr: 'husnummer',
    ejerlavkode: 'landsejerlav_kode',
    ejerlavnavn: 'landsejerlav_navn',
    adgangspunktid: 'adgangspunkt_id',
    kilde: 'adgangspunkt_kilde',
    ikraftfra: 'ikrafttraedelsesdato',
    noejagtighed: 'adgangspunkt_noejagtighedsklasse',
    tekniskstandard: 'adgangspunkt_tekniskstandard',
    tekstretning: 'adgangspunkt_retning',
    placering: 'adgangspunkt_placering',
    adressepunktaendringsdato: 'adgangspunkt_revisionsdato',
    etrs89oest: 'adgangspunkt_etrs89koordinat_oest',
    etrs89nord: 'adgangspunkt_etrs89koordinat_nord',
    wgs84lat: 'adgangspunkt_wgs84koordinat_bredde',
    wgs84long: 'adgangspunkt_wgs84koordinat_laengde',
    kn100mdk: 'adgangspunkt_DDKN_m100',
    kn1kmdk: 'adgangspunkt_DDKN_km1',
    kn10kmdk: 'adgangspunkt_DDKN_km10'
  },
  postnummer: {
    nr: 'postnummer'
  },
  enhedsadresse: {
    ikraftfra: 'ikrafttraedelsesdato'
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
  var key = _.reduce(object, function(memo, value, fieldName) {
    if(_.contains(datamodel.key, fieldName)) {
      memo[fieldName] = value;
    }
    return memo;
  }, {});
  console.log("key: " + JSON.stringify(key));
  crud.query(sqlClient, datamodel, key, function(err, results) {
    var existing = results.length > 0 ? results[0] : null;
    switch (event.aendringstype) {
      case "oprettelse":
        if(!_.isNull(existing)) {
          winston.warn("Fik en oprettelse event, men objektet findes allerede. " +
            "event: %d, Eksisterende: %j, oprettelse: %j",
          event.sekvensnummer, existing, object);
          crud.update(sqlClient, datamodel, object, callback);
        }
        else {
          console.log('creating ' + JSON.stringify(event));
          crud.create(sqlClient, datamodel, object, callback);
        }
        break;
      case 'aendring':
        if(_.isNull(existing)) {
          winston.warn("Fik en aendring event, men objektet findes ikke. " +
            "event: %d, objekt: %j", event.sekvensnummer, object);
          crud.create(sqlClient, datamodel, object, callback);

        }
        else {
          crud.update(sqlClient, datamodel, object, callback);
        }
        break;
      case 'nedlaeggelse':
        if(_.isNull(existing)) {
          winston.warn("Fik en nedlaeggelse event, men objektet findes ikke. " +
            "Event: %d, Objekt: %j", event.sekvensnummer, object);
        }
        crud.delete(sqlClient, datamodel, object, callback);
        break;
      default:
        throw 'handleSimpleEvent with unknown event type, insufficient input validation?!';
    }
  });
}

function handleSimpleEvent(sqlClient, event, callback) {
  var datamodel = getDatamodel([event.type]);
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
  winston.debug('husnr %s within interval %j', adgangsadresse.husnr, interval);
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

// returns true if the adress is on the side specified (either 'lige' or 'ulige')
function isOnSide(eventSide, adgangsadresse) {
  var numberShouldBeOdd = eventSide === 'ulige';
  var number = parseHusnr(adgangsadresse.husnr).nr;
  var numberIsOdd = ((number % 2) === 1);
  var isOnCorrectSide = numberShouldBeOdd === numberIsOdd;
  return isOnCorrectSide;
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
      if(!isOnSide(data.side, adgangsadresse)) {
        return memo;
      }
      var interval = _.find(data.intervaller, function(interval) {
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

function handlePostnummerEvent(sqlClient, event, callback) {
  return handleIntervalEvent(sqlClient, event, createPostnrUpdate, callback);
}

function handleSupplerendebynavnEvent(sqlClient, event, callback) {
  return handleIntervalEvent(sqlClient, event, createSupplerendebynavnUpdate, callback);
}
var eventHandlers = {
  enhedsadresse: handleSimpleEvent,
  adgangsadresse: handleSimpleEvent,
  vejnavn: function(sqlClient, event, callback) {
    return performSqlQuery(sqlClient,event,  datamodels.vejstykke, allRenames.vejnavn, callback);
  },
  postnummer: handlePostnummerEvent,
  supplerendebynavn: handleSupplerendebynavnEvent
};

function applyBbrEvent(sqlClient, event, callback) {
  eventHandlers[event.type](sqlClient, event, callback);
}

var bbrEventsDatamodel = {
  table: 'bbr_events',
  columns: ['sekvensnummer', 'sequence_number_from', 'sequence_number_to', 'type', 'bbrTidspunkt', 'created', 'data'],
  key: ['sekvensnummer']
};

function storeEvent(client, event, localSeqnumFrom, localSeqnumTo, callback) {
  var dbRow = {
    sekvensnummer: event.sekvensnummer,
    sequence_number_from: localSeqnumFrom,
    sequence_number_to: localSeqnumTo,
    type: event.type,
    bbrTidspunkt: event.tidspunkt,
    created: new Date().toISOString(),
    data: JSON.stringify(event.data)
  };
  crud.create(client, bbrEventsDatamodel, dbRow, callback);
}

function getLocalSeqNum(client, callback) {
  client.query("SELECT MAX(sequence_number) as max FROM transaction_history", [], function (err, result) {
    if (err) {
      return callback(err);
    }
    callback(null, result.rows[0].max ? result.rows[0].max : 0);
  });
}
function processEvent(client, event, callback) {
  bbrEventsLogger.info("Processing event", { sekvensnummer: event.sekvensnummer });
  var validator = new ZSchema();
  validator.validate(event, eventSchemas[event.type]).then(function(report) {
    var localSeqnumFrom, localSeqnumTo;
    async.series([
      // get the latest local sequence number
      function(callback) {
        getLocalSeqNum(client, function(err, seqnum) {
          if(err) {
            return callback(err);
          }
          localSeqnumFrom = seqnum;
          callback();
        });
      },
      function(callback) {
        applyBbrEvent(client, event, callback);
      },
      function(callback) {
        getLocalSeqNum(client, function(err, seqnum) {
          if(err) {
            return callback(err);
          }
          localSeqnumTo = seqnum;
          callback();
        });
      },
      function(callback) {
        storeEvent(client, event, localSeqnumFrom+1, localSeqnumTo, callback);
      }
    ], callback);
  }).catch(function(err) {
    bbrEventsLogger.error('Invalid event', err);
    // We ignore invalid events
    callback(null);
  });
}

module.exports.processEvent = processEvent;

// for testing purporses
module.exports.internal = {
  compareHusnr: compareHusnr,
  adresseWithinInterval: adresseWithinInterval,
  applyBbrEvent: applyBbrEvent
};