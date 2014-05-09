"use strict";

var cliParameterParsing = require('../../bbr/common/cliParameterParsing');
var request = require('request');
var winston = require('winston');
var AWS     = require('aws-sdk');
var _       = require('underscore');
var async   = require('async');
var util    = require('util');
var Q = require('q');

var dynamoEvents = require('../../bbr/common/dynamoEvents');

winston.handleExceptions(new winston.transports.Console());

var optionSpec = {
  awsRegion: [false, 'AWS region, hvor Dynamo databasen befinder sig', 'string', 'eu-west-1'],
  awsAccessKeyId: [false, 'Access key der anvendes for at tilgå Dynamo', 'string'],
  awsSecretAccessKey: [false, 'Secret der anvendes for at tilgå Dynamo', 'string'],
  dynamoTable: [false, 'Navn på dynamo table hvori hændelserne gemmes', 'string'],
  bbrFacadeUrl: [false, 'URL til bbr facaden der testes', 'string', 'http://localhost:3333']
};

function getLatestSequenceNumber(hostPort) {
  return Q.nfcall(function (callback) {
    return request.get(hostPort + '/sidsteSekvensnummer', function (err, response, body) {
      if (err) {
        return callback(err);
      }
      callback(null, parseInt(body));
    });
  });
}
cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {

  var hostPort = options.bbrFacadeUrl;

  var dd = new AWS.DynamoDB(
    {apiVersion      : '2012-08-10',
      region          : options.awsRegion,
      accessKeyId     : options.awsAccessKeyId,
      secretAccessKey : options.awsSecretAccessKey});


  var TABLE = options.dynamoTable;

  function postTestSpec(spec, cb){
    request({ method         : 'POST',
        uri            : hostPort+'/haendelse',
        'content-type' : 'application/json',
        json           : withSeqNr(spec.S, spec.H)},
      function (error, response, body) {
        if (error){
          return cb(error, body);
        }
        if(response.statusCode !== 200) {
          return cb(new Error("Unexpected status code: " + response.statusCode), body);
        }
        if (body.ignore === spec.C.ignore && body.error === spec.C.error && body.message === spec.C.message) {
          cb(null, body);
        } else {
          cb(body, body);
        }
      });
  }

  function assertEmptyDB(){
    dynamoEvents.getAllQ(dd, TABLE).then(function(data) {
      if (data.Count === 0){
        return;
      }
      else {
        throw new Error("DB not empty!");
      }
    });
  }

  function test(){
    return Q.nfcall(async.eachSeries,
      testSpec(),
      function(spec, cb){
        postTestSpec(spec, function(err, message){
          if (err) {
            winston.error('******* Error err=%j in spec=%j message=%j', err, spec, message, {});
            cb('Test error in spec: '+util.format('%j', spec));
          } else {
            winston.info('******* %s: serial=%s statusCode=%j(%j) error=%j',
              spec.H.type, spec.S, spec.C, message, err, {});
            cb();
          }
        });
      }
    );
  }

  function verifyLatestSequenceNumber(expected) {
    return function() {
      return getLatestSequenceNumber(hostPort).then(function(sequenceNumber) {
        winston.info('Verifying /sidsteSekvensnummer === 13');
        if(sequenceNumber !== expected) {
          throw new Error('Unexpected sequence number ' + expected);
        }
        return true;
      });
    };
  }

  /*******************************************************************************
   ***** Main function ************************************************************
   *******************************************************************************/

  dynamoEvents.deleteAllQ(dd, TABLE).then(assertEmptyDB).then(test).then(verifyLatestSequenceNumber(13)).done();
});


/*******************************************************************************
***** Commands *****************************************************************
*******************************************************************************/

//TODO invalid data tests!

var TD = {}; // TestData. This is modified later in the file

function testSpec(){
  // s=sekvensnummer, h=haendelse, c=http-status-code
  return [{S: 1,  H: TD.adgangsadresse,            C: {error: false, ignore: false}},
          {S: 2,  H: TD.enhedsadresse,             C: {error: false, ignore: false}},
          {S: 3,  H: TD.vejnavn,                   C: {error: false, ignore: false}},
          {S: 4,  H: TD.supplerendebynavn,         C: {error: false, ignore: false}},
          {S: 5,  H: TD.postnummer,                C: {error: false, ignore: false}},
          {S: 5,  H: TD.postnummer,                C: {error: false, ignore: true, message: 'Sequence number already known' }},
          {S: 5,  H: TD.postnummer,                C: {error: false, ignore: true, message: 'Sequence number already known' }},
          {S: 5,  H: TD.vejnavn,                   C: {error: true, ignore: true, message: 'Sequence number already known, but event differs' }},
          {S: 6,  H: TD.vejnavn,                   C: {error: false, ignore: false}},
          {S: 8,  H: TD.vejnavn,                   C: {error: true, ignore: false, message: 'Received message out of order, sequence number too large'}},
          {S: 7,  H: TD.vejnavn,                   C: {error: true, ignore: true, message: 'Received message out of order, sequence number too small'}},
          {S: 9,  H: TD.vejnavnNull,               C: {error: false, ignore: false}},
          {S: 10,  H: TD.enhedsadresseFail,         C: {error: true, ignore: false, message: 'Kunne ikke validere hændelse' }},
          {S: 11,  H: TD.supplerendebynavnFail,     C: {error: true, ignore: false, message: 'Kunne ikke validere hændelse' }},
          {S: 12,  H: TD.supplerendebynavnFail2,    C: {error: true, ignore: false, message: 'Kunne ikke validere hændelse' }},
          {S: 13,  H: TD.vejnavn,                   C: {error: false, ignore: false}}
         ];
}



/*******************************************************************************
***** Test data and helper function ********************************************
*******************************************************************************/

function withSeqNr(seqNr, haendelse){
  var clone = _.clone(haendelse);
  clone.sekvensnummer = seqNr;
  return clone;
}


TD.adgangsadresse = {
  "type": "adgangsadresse",
  "sekvensnummer": 1004,
  "lokaltSekvensnummer": 102,
  "aendringstype": "aendring",
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "id": "0a3f50c1-d506-32b8-e044-0003ba298018",
    "vejkode": 1023,
    "husnummer": "12B",
    "kommunekode": 461,
    "landsejerlav_kode": 12345678,
    "landsejerlav_navn": "Eskebjerg by, Bregninge",
    "matrikelnr": "18b",
    "esrejendomsnr": "001388",
    "postnummer": 4050,
    "postdistrikt": "Skibby",
    "supplerendebynavn": "Hyllingeriis",
    "objekttype": 1,
    "oprettet":"1999-02-05T12:00:00+00:00",
    "aendret":"2000-02-05T12:00:00+00:00",
    "adgangspunkt_id": "2CB20550-E0F9-405B-BB42-50D0CC4C44C1",
    "adgangspunkt_kilde": "1",
    "adgangspunkt_noejagtighedsklasse": "A",
    "adgangspunkt_tekniskstandard": "TD",
    "adgangspunkt_retning": 128.34,
    "adgangspunkt_placering": "5",
    "adgangspunkt_revisionsdato": "2000-02-05T12:00:00+00:00",
    "adgangspunkt_etrs89koordinat_oest": 761234.89,
    "adgangspunkt_etrs89koordinat_nord": 451234.89,
    "adgangspunkt_wgs84koordinat_bredde":  6.8865950053481,
    "adgangspunkt_wgs84koordinat_laengde": 8.55860108915762,
    "adgangspunkt_DDKN_m100": "100m_61768_6435",
    "adgangspunkt_DDKN_km1": "1km_6176_643",
    "adgangspunkt_DDKN_km10": "10km_617_64"
  }
};


TD.enhedsadresseFail = {
  "type": "enhedsadresse",
  "sekvensnummer": 1004,
  "lokaltSekvensnummer": 102,
  "aendringstype": "ændring",
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "id": "0a3f50c1-d506-32b8-e044-0003ba298018",
    "etage": "1",
    "doer": null,
    "objekttype": 1,
    "oprettet":"1999-02-05T12:00:00+00:00",
    "aendret":"2000-02-05T12:00:00+00:00"
  }
};
TD.enhedsadresse = {
  "type": "enhedsadresse",
  "sekvensnummer": 1004,
  "lokaltSekvensnummer": 102,
  "aendringstype": "aendring",
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "id": "0a3f50c1-d506-32b8-e044-0003ba298018",
    "adgangsadresseid": "8BC7C8E6-B01A-4006-BEAD-6A06C3FD4B96",
    "etage": "1",
    "doer": null,
    "objekttype": 1,
    "oprettet":"1999-02-05T12:00:00+00:00",
    "aendret":"2000-02-05T12:00:00+00:00"
  }
};

TD.postnummer = {
  "type": "postnummer",
  "sekvensnummer": 1005,
  "lokaltSekvensnummer": 205,
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "kommunekode": 101,
    "vejkode": 1010,
    "side": "ulige",
    "intervaller": [{"husnrFra": "11",
                     "husnrTil": "213",
                     "nummer": 5000},
                    {"husnrFra": "10",
                     "husnrTil": "220",
                     "nummer": 4000}
                   ]
  }
};

TD.vejnavn = {
  "type": "vejnavn",
  "sekvensnummer": 1005,
  "lokaltSekvensnummer": 205,
  "aendringstype": "aendring",
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "kommunekode": 101,
    "vejkode": 1010,
    "navn": "Niels Bohrs Alle",
    "adresseringsnavn": "Niels Bohrs Alle",
    "oprettet": "2000-02-05T12:00:00+00:00",
    "aendret": "2000-02-05T12:00:00+00:00"
  }
};

TD.vejnavnNull = {
  "type": "vejnavn",
  "sekvensnummer": 1005,
  "lokaltSekvensnummer": 205,
  "aendringstype": "aendring",
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "kommunekode": 101,
    "vejkode": 1010,
    "navn": "Niels Bohrs Alle",
    "adresseringsnavn": null,
    "oprettet": "2000-02-05T12:00:00+00:00",
    "aendret": "2000-02-05T12:00:00+00:00"
  }
};

TD.supplerendebynavn = {
  "type": "supplerendebynavn",
  "sekvensnummer": 1005,
  "lokaltSekvensnummer": 205,
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "kommunekode": 101,
    "vejkode": 1010,
    "side": "ulige",
    "intervaller": [{"husnrFra": "11",
                     "husnrTil": "213",
                     "nummer": 5000},
                    {"husnrFra": "10",
                     "husnrTil": "220",
                     "nummer": 4000}
                   ]
  }
};

TD.supplerendebynavnFail = {
  "type": "supplerendebynavn",
  "sekvensnummer": 1005,
  "lokaltSekvensnummer": 205,
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "kommunekode": null,
    "vejkode": 1010,
    "side": "ulige",
    "intervaller": [{"husnrFra": "11",
                     "husnrTil": "213",
                     "nummer": 5000},
                    {"husnrFra": "10",
                     "husnrTil": "220",
                     "nummer": 4000}
                   ]
  }
};

TD.supplerendebynavnFail2 = {
  "type": "supplerendebynavn",
  "sekvensnummer": 1005,
  "lokaltSekvensnummer": 205,
  "data": {
    "kommunekode": null,
    "vejkode": 1010,
    "side": "lige",
    "intervaller": [{"husnrFra": "11",
                     "husnrTil": "213",
                     "nummer": 5000},
                    {"husnrFra": "10",
                     "husnrTil": "220",
                     "nummer": 4000}
                   ]
  }
};