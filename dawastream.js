console.log('dawastream modul');

var util = require('util')
	, MongoAdresseStream= require("./mongoadressestream").MongoAdresseStream
	, MongoVejnavneStream= require("./mongovejnavnestream").MongoVejnavneStream
	, MongoPostnummerStream= require("./mongopostnummerstream").MongoPostnummerStream
  , AdresseStream= require("./adressestream").AdresseStream
  , PostnummerStream= require("./postnummerstream").PostnummerStream
  , VejnavnStream= require("./vejnavnstream").VejnavnStream
  , JSONStream= require("JSONStream")
  , JSONPStream= require("./jsonpstream").JSONPStream
  , CsvAdresseStream= require("./csvadressestream").CsvAdresseStream
  , Vejnavn2AdresseStream= require("./vejnavn2adressestream").Vejnavn2AdresseStream;

exports.streamAdresser= function(format, cursor, enadresse, callbackname, response) {
  var mongoadressestream= new MongoAdresseStream(cursor)
  , adressestream= new AdresseStream();

  if (format === 'json') {
	  var jsonstream= enadresse?JSONStream.stringify("","","\n"):JSONStream.stringify()
   	, jsonpstream= new JSONPStream(callbackname,response);
	  mongoadressestream.pipe(adressestream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
 	}
  else if (format === 'csv') {
    var csvadressestream= new CsvAdresseStream(response);
    //mongoadressestream.pipe(adressestream).pipe(csvadressestream).pipe(response);
    mongoadressestream.pipe(csvadressestream).pipe(response);
  }
}

exports.streamPostnumre= function(format, cursor, enadresse, callbackname, response) {
  var mongopostnummerstream= new MongoPostnummerStream(cursor)
  , postnummerstream= new PostnummerStream();

  if (format === 'json') {
    var jsonstream= enadresse?JSONStream.stringify("","","\n"):JSONStream.stringify()
    , jsonpstream= new JSONPStream(callbackname,response);
    mongopostnummerstream.pipe(postnummerstream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
  }
}

exports.streamVejnavne= function(format, cursor, etvejnavn, callbackname, response) {
  var mongovejnavnestream= new MongoVejnavneStream(cursor)
  , vejnavnstream= new VejnavnStream();

  if (format === 'json') {
    var jsonstream= etvejnavn?JSONStream.stringify("","","\n"):JSONStream.stringify()
    , jsonpstream= new JSONPStream(callbackname,response);
    mongovejnavnestream.pipe(vejnavnstream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
  }
}

exports.streamAutocompleteAdresser= function(format, cursor, enadresse, callbackname, response) {
  var mongovejnavnestream= new MongoVejnavneStream(cursor)
  , vejnavn2adressestream= new Vejnavn2AdresseStream()
  , adressestream= new AdresseStream();

  if (format === 'json') {
	  var jsonstream= enadresse?JSONStream.stringify("","","\n"):JSONStream.stringify()
   	, jsonpstream= new JSONPStream(callbackname,response);
	  mongovejnavnestream.pipe(vejnavn2adressestream).pipe(adressestream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
 	}
}