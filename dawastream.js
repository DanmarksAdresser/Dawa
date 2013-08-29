console.log('dawastream modul');

var util = require('util')
	, MongoAdresseStream= require("./mongoadressestream").MongoAdresseStream
	, MongoVejnavneStream= require("./mongovejnavnestream").MongoVejnavneStream
  , AdresseStream= require("./adressestream").AdresseStream
  , JSONStream= require("JSONStream")
  , JSONPStream= require("./jsonpstream").JSONPStream
  , Vejnavn2AdresseStream= require("./vejnavn2adressestream").Vejnavn2AdresseStream;

exports.streamAdresser= function(format, cursor, enadresse, callbackname, response) {
  var mongoadressestream= new MongoAdresseStream(cursor)
  , adressestream= new AdresseStream();

  if (format === 'json') {
	  var jsonstream= enadresse?JSONStream.stringify("","",""):JSONStream.stringify()
   	, jsonpstream= new JSONPStream(callbackname,response);
	  mongoadressestream.pipe(adressestream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
 	}
}

exports.streamAutocompleteAdresser= function(format, cursor, enadresse, callbackname, response) {
  var mongovejnavnestream= new MongoVejnavneStream(cursor)
  , vejnavn2adressestream= new Vejnavn2AdresseStream()
  , adressestream= new AdresseStream();

  if (format === 'json') {
	  var jsonstream= enadresse?JSONStream.stringify("","",""):JSONStream.stringify()
   	, jsonpstream= new JSONPStream(callbackname,response);
	  mongovejnavnestream.pipe(vejnavn2adressestream).pipe(adressestream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
 	}
}