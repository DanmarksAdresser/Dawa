"use strict";

var async = require('async');
var ZSchema = require("z-schema");
var util = require('util');
var _ = require('underscore');

var bbrEventsLogger = require('../../logger').forCategory('bbrEventsProcessing');
var crud = require('../../crud/crud');
var datamodels = require('../../crud/datamodel');
var eventSchemas = require('../common/eventSchemas');
var bbrTransformers = require('../common/bbrTransformers');

function getDatamodel(eventType) {
  if(eventType === 'enhedsadresse') {
    return datamodels.adresse;
  }
  else {
    return datamodels[eventType];
  }
}


function extractObjectFromSimpleEvent(eventData, datamodel) {
  var result =  bbrTransformers[datamodel.name](eventData);
  bbrEventsLogger.debug('Transformed object', {eventData: eventData, result: result});
  return result;
}

function performSqlQuery(sqlClient, event, datamodel, callback) {
  var object = extractObjectFromSimpleEvent(event.data, datamodel);
  if(!object) {
    bbrEventsLogger.info('Ignored event because it was filtered', {
      event: event
    });
    return callback(null);
  }
  var key = _.reduce(datamodel.key, function(memo, keyColumn) {
    memo[keyColumn] = object[keyColumn];
    return memo;
  }, {});
  crud.query(sqlClient, datamodel, key, function(err, results) {
    var existing = results.length > 0 ? results[0] : null;
    switch (event.aendringstype) {
      case "oprettelse":
        if(!_.isNull(existing)) {
          bbrEventsLogger.error("Fik en oprettelse event, men objektet findes allerede. " +
            "event: %d, Eksisterende: %j, oprettelse: %j",
          event.sekvensnummer, existing, object);
          crud.update(sqlClient, datamodel, object, callback);
        }
        else {
          bbrEventsLogger.debug('creating object', {event: event});
          crud.create(sqlClient, datamodel, object, callback);
        }
        break;
      case 'aendring':
        if(_.isNull(existing)) {
          bbrEventsLogger.error("Fik en aendring event, men objektet findes ikke. " +
            "event: %d, objekt: %j", event.sekvensnummer, object);
          crud.create(sqlClient, datamodel, object, callback);

        }
        else {
          crud.update(sqlClient, datamodel, object, callback);
        }
        break;
      case 'nedlaeggelse':
        if(_.isNull(existing)) {
          bbrEventsLogger.error("Fik en nedlaeggelse event, men objektet findes ikke. " +
            "Event: %d, Objekt: %j", event.sekvensnummer, object);
        }
        crud.delete(sqlClient, datamodel, object, callback);
        break;
      default:
        throw new Error('handleSimpleEvent with unknown event type, insufficient input validation?!');
    }
  });
}

function handleSimpleEvent(sqlClient, event, callback) {
  var datamodel = getDatamodel(event.type);
  performSqlQuery(sqlClient, event, datamodel, callback);
}

function removePrefixZeroes(str) {
  while (str && str.charAt(0) === '0') {
    str = str.substring(1);
  }
  return str;
}

function parseHusnr(husnr) {
  husnr = removePrefixZeroes(husnr).trim();
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

// Note: denne funktion checker IKKE om adressen er på den rigtige side
function adresseWithinInterval(adgangsadresse, interval) {
  if(!adgangsadresse.husnr) {
    return false;
  }
  return compareHusnr(adgangsadresse.husnr, interval.husnrFra) >= 0 &&
    compareHusnr(adgangsadresse.husnr, interval.husnrTil) <= 0;
}

function createSupplerendebynavnUpdate(adgangsadresse, interval) {
  var supplerendebynavn = interval ? interval.navn : null;
  if(supplerendebynavn) {
    supplerendebynavn = supplerendebynavn.trim();
  }
  if(adgangsadresse.supplerendebynavn !== supplerendebynavn) {
    return {
      id: adgangsadresse.id,
      supplerendebynavn: supplerendebynavn
    };
  }
  return null;
}

function createPostnrUpdate(adgangsadresse, interval) {
  var postnr = interval ? interval.nummer : null;
  if(postnr !== adgangsadresse.postnr) {
    return {
      id: adgangsadresse.id,
      postnr: postnr
    };
  }
  return null;
}

// returns true if the adress is on the side specified (either 'lige' or 'ulige')
function isOnSide(eventSide, adgangsadresse) {
  var numberShouldBeOdd = eventSide === 'ulige';
  var number = parseHusnr(adgangsadresse.husnr).nr;
  var numberIsOdd = ((number % 2) === 1);
  var isOnCorrectSide = numberShouldBeOdd === numberIsOdd;
  return isOnCorrectSide;
}

/**
 * Beregner de updates, som skal udføres på grund af en interval (postnummer eller supplerendebynavn) event.
 * @param adgangsadresserPaaVejstykke De adgangsadresser, der findes på vejstykket
 * @param eventData data fra eventet
 * @param createUpdate funktion, der tager en adgangsadresse og et interval fra eventet og returnerer
 * en update operation.
 * @returns Array af updates der skal udføres
 */
function intervalEventChanges(adgangsadresserPaaVejstykke, eventData, createUpdate) {
  return _.reduce(adgangsadresserPaaVejstykke, function (memo, adgangsadresse) {
    if (!isOnSide(eventData.side, adgangsadresse)) {
      return memo;
    }
    var interval = _.find(eventData.intervaller, function (interval) {
      return adresseWithinInterval(adgangsadresse, interval);
    });
    var update = createUpdate(adgangsadresse, interval);
    if(update) {
      memo.push(update);
    }
    return memo;
  }, []);
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
    var updates = intervalEventChanges(adgangsadresser, data, createUpdate);
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
    return performSqlQuery(sqlClient,event,  datamodels.vejstykke, callback);
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
    data: JSON.stringify(event)
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

function updateBbrSekvensnummer(client, sekvensnummer, callback) {
  client.query('UPDATE bbr_sekvensnummer SET sequence_number=$1', [sekvensnummer], callback);
}

function processEvent(client, event, callback) {
  bbrEventsLogger.info("Processing event", { sekvensnummer: event.sekvensnummer });
  var validator = new ZSchema();
  var valid = validator.validate(event, eventSchemas[event.type]);
  if(!valid) {
    bbrEventsLogger.error('Invalid event', { errors: validator.getLastErrors() });
    // we ignore invalid events
    return callback(null);
  }
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
      updateBbrSekvensnummer(client, event.sekvensnummer, callback);
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
}

module.exports.processEvent = processEvent;

// for testing purporses
module.exports.internal = {
  compareHusnr: compareHusnr,
  adresseWithinInterval: adresseWithinInterval,
  applyBbrEvent: applyBbrEvent,
  isOnSide: isOnSide,
  intervalEventChanges: intervalEventChanges,
  createPostnrUpdate: createPostnrUpdate,
  createSupplerendebynavnUpdate: createSupplerendebynavnUpdate
};