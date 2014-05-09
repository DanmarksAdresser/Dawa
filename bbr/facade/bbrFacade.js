"use strict";

var AWS            = require('aws-sdk');
var express        = require('express');
var Q = require('q');
var ZSchema        = require("z-schema");
var _              = require('underscore');

var cliParameterParsing = require('../common/cliParameterParsing');
var dynamoEvents = require('./../common/dynamoEvents');
var eventSchemas = require('./../common/eventSchemas');
var facadeLogger        = require('../../logger').forCategory('bbrFacade');
var facadeLoggerIncidents = require('../../logger').forCategory('bbrFacadeIncidents');

var optionSpec = {
  awsRegion: [false, 'AWS region, hvor Dynamo databasen befinder sig', 'string', 'eu-west-1'],
  awsAccessKeyId: [false, 'Access key der anvendes for at tilgå Dynamo', 'string'],
  awsSecretAccessKey: [false, 'Secret der anvendes for at tilgå Dynamo', 'string'],
  dynamoTable: [false, 'Navn på dynamo table hvori hændelserne gemmes', 'string'],
  listenPort: [false, 'TCP port hvor der tages imod hændelser fra BBR via HTTP kald', 'number', 3333]
};

Q.longStackSupport = true;

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  /********************************************************************************
   ***** Setup *********************************************************************
   ********************************************************************************/

  var dd = new AWS.DynamoDB({apiVersion      : '2012-08-10',
    region          : options.awsRegion,
    accessKeyId     : options.awsAccessKeyId,
    secretAccessKey : options.awsSecretAccessKey});

  var TABLENAME = options.dynamoTable;
  var listenPort = options.listenPort;

  var app = express();
  app.use(express.compress());
  app.use(express.bodyParser());


  /********************************************************************************
   ***** Routes ********************************************************************
   ********************************************************************************/

  app.get('/', function (req, res) {
    res.send("<h4>Dette er AWS endepunktet for BBR hændelser</h4>"+
      "Brug HTTP POST /haendelse for at afgive en hændelse.<br>"+
      'Mere dokumentation kan findes på '+
      '<a href="https://github.com/DanmarksAdresser/Dawa/tree/master/bbr-facade/doc">'+
      'github.com/DanmarksAdresser/Dawa/tree/master/bbr-facade/doc</a><br>'+
      'Se sekvensnummeret for sidste hændelse her: <a href="/sidsteSekvensnummer">/sidsteSekvensnummer</a>');
  });

// Can be used for monitoring
  app.get('/sidsteSekvensnummer', function (req, res) {
    dynamoEvents.getLatestQ(dd, TABLENAME).then(function(latest) {
      if (latest.Items.length > 0)
      {
        res.send(""+latest.Items[0].seqnr.N);
      }
      else
      {
        res.send("0");
      }
    }, function(error) {
      facadeLogger.error('DynamoDB query ERROR', error);
      res.json(500, error);
    });
  });

  app.post('/haendelse', function (req, res) {
    if(!req.is('json')) {
      return res.send(400, 'Request content type must be json');
    }
    var haendelse = req.body;
    facadeLogger.info('Received haendelse', {haendelse:haendelse});
    var validationResult = validateSchemaQ(haendelse);
    if(validationResult.error) {
      facadeLoggerIncidents.error(validationResult.message, validationResult.details);
    }
    if(validationResult.ignore) {
      return res.json(200, validationResult);
    }
    dynamoEvents.getLatestQ(dd, TABLENAME).then(function(latest) {
      return [latest, validateSequenceNumberQ(haendelse, latest)];
    }).spread(function(latest, sequenceValidationResult) {
      if(sequenceValidationResult.error) {
        facadeLoggerIncidents.error(sequenceValidationResult.message, sequenceValidationResult.details);
      }
      var result = validationResult.error ? validationResult : sequenceValidationResult;
      result.ignore = result.ignore || sequenceValidationResult.ignore;
      if(sequenceValidationResult.ignore) {
        return result;
      }
      else {
        return dynamoEvents.putItemQ(dd, TABLENAME, haendelse.sekvensnummer, haendelse).then(function() {
          return result;
        });
      }
    }).then(function(result) {
      res.json(200, result);
    }, function(error) {
      facadeLoggerIncidents.error("An error happened when trying to save event to dynamodb", error);
      res.json(500, error);
    });
  });

  function validateSequenceNumberQ(haendelse, latest) {
    var newSeqNr = parseInt(haendelse.sekvensnummer);
    var len = latest.Items.length;
    var lastSeqNr = parseInt(len > 0 ? latest.Items[0].seqnr.N : '0');
    if (lastSeqNr === newSeqNr)
    {
      var lastJson = JSON.parse(latest.Items[0].data.S);
      if (_.isEqual(haendelse, lastJson))
      {
        return {
          ignore: true,
          error: false,
          message: "Sequence number already known",
          details: {
            sequenceNumber: newSeqNr
          }
        };
      }
      else {
        return {
          ignore: true,
          error: true,
          message: 'Sequence number already known, but event differs',
          details: {
            existingEvent: lastJson,
            newEvent: haendelse,
            seqNr: newSeqNr
          }
        };
      }
    }
    else if(lastSeqNr + 1 === newSeqNr) {
      return {
        ignore: false,
        error: false
      };
    }
    else if (lastSeqNr > newSeqNr) {
      return {
        ignore: true,
        error: true,
        message: "Received message out of order, sequence number too small",
        details: {
          newEvent: haendelse,
          lastSeqNr: lastSeqNr,
          newSeqNr: newSeqNr
        }
      };
    }
    else { // lastSeqNr < newSeqNr
      return {
        ignore: false,
        error: true,
        message: 'Received message out of order, sequence number too large',
        details: {
          newEvent: haendelse,
          lastSeqNr: lastSeqNr,
          newSeqNr: newSeqNr
        }
      };
    }
  }

  /*******************************************************************************
   **** Some more setup. Have to be after the routes ******************************
   *******************************************************************************/


  app.listen(listenPort);
//https.createServer(app).listen(listenPort);

  facadeLogger.info("Express server listening for connections", {listenPort: listenPort, mode: app.settings.env});


  /*******************************************************************************
   **** Helper functions **********************************************************
   *******************************************************************************/

  var validator = new ZSchema({ sync: true });

  function validateSchemaQ(json) {
    if(!validator.validate(json, eventSchemas.basicHaendelseSchema)) {
      return {
        ignore: true,
        error: true,
        message: "Kunne ikke validere hændelse",
        details: {
          schemaValidationError: validator.getLastError()
        }
      };
    }
    function validate(schema){
      if (!validator.validate(json, schema)) {
        return {
          ignore: false,
            error: true,
          message: "Kunne ikke validere hændelse",
          details: {
            schemaValidationError: validator.getLastError()
          }
        };
      }
      else {
        return {
          ignore: false,
          error: false
        };
      }
    }
    switch (json.type) {
      case 'enhedsadresse'     : return validate(eventSchemas.enhedsadresse);
      case 'vejnavn'           : return validate(eventSchemas.vejnavn);
      case 'supplerendebynavn' : return validate(eventSchemas.supplerendebynavn);
      case 'postnummer' : return validate(eventSchemas.postnummer);
      case 'adgangsadresse'    : return validate(eventSchemas.adgangsadresse);
      default:
        // cannot happen, because we validated it.
        throw new Error("Haendelse havde uventet type");
    }
  }

  /********************************************************************************
   ***** EOF ***********************************************************************
   ********************************************************************************/
});
