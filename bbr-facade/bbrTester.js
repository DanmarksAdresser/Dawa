"use strict";

var request = require('request');
var winston = require('winston');
var AWS     = require('aws-sdk');
var _       = require('underscore');
var async   = require('async');

var TABLE = 'dawatest';
var hostPort = 'localhost:3333';
var dd = new AWS.DynamoDB({apiVersion      : '2012-08-10',
                           region          : 'eu-west-1',
                           accessKeyId     : process.env.accessKeyId,
                           secretAccessKey : process.env.secretAccessKey});

winston.handleExceptions(new winston.transports.Console());

winston.info('Start BBR input test...');

function main(){
  async.series([deleteAll,
                wait,
                assertEmptyDB,
                test
               ],
               function (err, results){
                 winston.info('Test results: %j %j', err, results, {});
               }
              );
}

function wait(cb){
  winston.info('Waiting a bit -- to ensure that deletes has completed....');
  setTimeout(cb, 500);
}

function test(cb){
  winston.info('starting test');
  async.eachSeries([{data: withSerial(1, adgangsadresseEx),    willSucceed: true},
                    {data: withSerial(2, enhedsadresseEx),     willSucceed: true},
                    {data: withSerial(3, postnummerEx),        willSucceed: true},
                    {data: withSerial(4, supplerendebynavnEx), willSucceed: true},
                    {data: withSerial(5, vejnavnEx),           willSucceed: true},
                    {data: withSerial(5, vejnavnEx),           willSucceed: false},
                    {data: withSerial(6, vejnavnEx),           willSucceed: true},
                    {data: withSerial(7, vejnavnEx),           willSucceed: true},
                    {data: withSerial(9, vejnavnEx),           willSucceed: false},
                    {data: withSerial(8, vejnavnEx),           willSucceed: true},
                    {data: withSerial(9, vejnavnEx),           willSucceed: true},
                   ],
                   function(o, cb){
                     post(o.data, function(err){
                       if (err && o.willSucceed) {
                         winston.error('Error %j', err,{});
                         cb('excepted success, but got an error for serial: '+o.serial);
                       } else if (!err && !o.willSucceed){
                         cb('excepted error for serial='+o.serial+' but got success!');
                       } else {
                         winston.info('%s: serial=%s success! willSucceed=%j got=%j', o.data.type, o.serial, o.willSucceed, err, {});
                         cb();
                       }
                     });
                   },
                   function(err){
                     if (err) {
                       winston.info('Error %s', err);
                     } else {
                       winston.info('***************');
                       winston.info('Test SUCCESS!!!');
                     }
                   }
                  );
}



function post(haendelse, cb){
  request({ method         : 'POST',
            uri            : 'http://'+hostPort+'/haendelse',
            'content-type' : 'application/json',
            json           : haendelse},
          function (error, response, body) {
            if (response.statusCode !== 200){
              cb(body);
            } else {
              cb(null);
            }
          });
}

function getAll(cb) {
  var params = {TableName: 'dawatest',
                KeyConditions: {'key': {ComparisonOperator: 'EQ',
                                        AttributeValueList: [{'S': 'haendelser' }]}},
                ConsistentRead: true,
               };
  dd.query(params, cb);
}

function deleteAll(cb){
  winston.info('Deleting all items');
  getAll(function(error, data){
    if (data.Count === 0){
      cb(null);
    } else {
      async.eachSeries(data.Items,
                       function(item, cb){
                         winston.info('Delete item %j', item.serial.N, {});
                         dd.deleteItem({TableName: TABLE, Key: {key:    {S: 'haendelser'},
                                                                serial: {N: item.serial.N}}},
                                       cb);
                       },
                       function(err) {cb(err);});
    }
  });
}

function logAll(cb){
  getAll(function(error, data){
    winston.info('items: error=%j itemCount=%j', error, data.Count, {});
    _.each(data.Items, function(item){
      winston.info('  item: %s %j', item.serial.N, item.data, {});
    });
    cb(null);
  });
}

function assertEmptyDB(cb){
  getAll(function(error, data){
    if (error) {return cb(error);}
    if (data.Count === 0){
      cb(null);
    } else {
      winston.error('DB not empty: %j', data, {});
      cb('DB not empty!');
    }
  });
}

function withSerial(serial, haendelse){
  var clone = _.clone(haendelse);
  clone.sekvensnummer = serial;
  return clone;
}


var adgangsadresseEx = {
  "type": "adgangsadresse",
  "sekvensnummer": 1004,
  "lokaltsekvensnummer": 102,
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


var enhedsadresseEx = {
  "type": "enhedsadresse",
  "sekvensnummer": 1004,
  "lokaltsekvensnummer": 102,
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

var postnummerEx = {
  "type": "postnummer",
  "sekvensnummer": 1005,
  "lokaltsekvensnummer": 205,
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

var vejnavnEx = {
  "type": "vejnavn",
  "sekvensnummer": 1005,
  "lokaltsekvensnummer": 205,
  "aendringstype": "aendring",
  "tidspunkt": "2000-02-05T12:00:00+00:00",
  "data": {
    "kommunekode": 101,
    "vejkode": 1010,
    "navn": "Niels Bohrs Alle",
    "adresseringsnavn": "Niels Bohrs Alle"
  }
};

var supplerendebynavnEx = {
  "type": "supplerendebynavn",
  "sekvensnummer": 1005,
  "lokaltsekvensnummer": 205,
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

main();
