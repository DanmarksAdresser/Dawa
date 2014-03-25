"use strict";

var request = require('request');
var winston = require('winston');
var AWS     = require('aws-sdk');
var _       = require('underscore');
var async   = require('async');
var util    = require('util');

var dynamoEvents = require('../../bbr/common/dynamoEvents');

winston.handleExceptions(new winston.transports.Console());

var TABLE = 'dawatest';
var hostPort = 'localhost:3333';
var dd = new AWS.DynamoDB(
  {apiVersion      : '2012-08-10',
   region          : 'eu-west-1',
   accessKeyId     : process.env.awsAccessKeyId,
   secretAccessKey : process.env.awsSecretAccessKey});

/*******************************************************************************
***** Main function ************************************************************
*******************************************************************************/

function main(){
  async.series(
    [
      print('Starting the BBR Facade test....'),
      function(callback) {
        dynamoEvents.deleteAll(dd, TABLE, callback);
      },
      print('Assert that the DB is empty'),
      assertEmptyDB,
      print('Run the test'),
      test
    ],
    function (err, results){
      winston.info('Error in test commands: %j %j', err, results, {});
    }
  );
}


/*******************************************************************************
***** Commands *****************************************************************
*******************************************************************************/

//TODO invalid data tests!

var TD = {}; // TestData. This is modified later in the file

function testSpec(){
  // s=sekvensnummer, h=haendelse, c=http-status-code
  return [{S: 1,  H: TD.adgangsadresse,            C: 200},
          {S: 2,  H: TD.enhedsadresse,             C: 200},
          {S: 3,  H: TD.vejnavn,                   C: 200},
          {S: 4,  H: TD.supplerendebynavn,         C: 200},
          {S: 5,  H: TD.postnummer,                C: 200},
          {S: 5,  H: TD.postnummer,                C: 200},
          {S: 5,  H: TD.postnummer,                C: 200},
          {S: 5,  H: TD.vejnavn,                   C: 400},
          {S: 6,  H: TD.vejnavn,                   C: 200},
          {S: 8,  H: TD.vejnavn,                   C: 400},
          {S: 7,  H: TD.vejnavn,                   C: 200},
          {S: 8,  H: TD.vejnavnNull,               C: 200},
          {S: 9,  H: TD.enhedsadresseFail,         C: 400},
          {S: 9,  H: TD.supplerendebynavnFail,     C: 400},
          {S: 9,  H: TD.supplerendebynavnFail2,    C: 400},
          {S: 9,  H: TD.vejnavn,                   C: 200},
         ];
}

function test(cb){
  async.eachSeries(
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
    },
    function(err){
      if (err) {
        winston.error('Error %s', err);
      } else {
        winston.info('***************');
        winston.info('Test SUCCESS!!!');
      }
    }
  );
}



function postTestSpec(spec, cb){
  request({ method         : 'POST',
            uri            : 'http://'+hostPort+'/haendelse',
            'content-type' : 'application/json',
            json           : withSeqNr(spec.S, spec.H)},
          function (error, response, body) {
            if (error){return cb(error, body);}
            if (response.statusCode === spec.C){
              cb(null, body);
            } else {
              cb(body, body);
            }
          });
}


function print(str){
  return function (cb){
    winston.info('***** '+str);
    cb();
  };
}

function assertEmptyDB(cb){
  dynamoEvents.getAll(dd, TABLE, function(error, data){
    if (error) {return cb(error);}
    if (data.Count === 0){
      cb();
    } else {
      winston.error('DB not empty: %j', data, {});
      cb('DB not empty!');
    }
  });
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
    "DDKN_m100": "100m_61768_6435",
    "DDKN_km1": "1km_6176_643",
    "DDKN_km10": "10km_617_64"
  }
};


TD.enhedsadresseFail = {
  "type": "enhedsadresse",
  "sekvensnummer": 1004,
  "lokaltSekvensnummer": 102,
  "aendringstype": "aendring",
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
    "intervaller": [{"husnrFra": "11",
                     "husnrTil": "213",
                     "side": "ulige",
                     "nummer": 5000},
                    {"husnrFra": "10",
                     "husnrTil": "220",
                     "side": "lige",
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
    "intervaller": [{"husnrFra": "11",
                     "husnrTil": "213",
                     "side": "ulige",
                     "nummer": 5000},
                    {"husnrFra": "10",
                     "husnrTil": "220",
                     "side": "lige",
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
    "intervaller": [{"husnrFra": "11",
                     "husnrTil": "213",
                     "side": "ulige",
                     "nummer": 5000},
                    {"husnrFra": "10",
                     "husnrTil": "220",
                     "side": "lige",
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
    "intervaller": [{"husnrFra": "11",
                     "husnrTil": "213",
                     "side": "ulige",
                     "nummer": 5000},
                    {"husnrFra": "10",
                     "husnrTil": "220",
                     "side": "lige",
                     "nummer": 4000}
                   ]
  }
};

/**********************************************************************/

// Run main!
main();
