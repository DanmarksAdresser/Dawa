
var util = require('util')
	, MongoAdresseStream= require("./mongoadressestream").MongoAdresseStream
	, MongoVejnavneStream= require("./mongovejnavnestream").MongoVejnavneStream
	, MongoPostnummerStream= require("./mongopostnummerstream").MongoPostnummerStream
  , AdresseStream= require("./adressestream").AdresseStream
  , AdresseGeoJSONStream= require("./adressegeojsonstream").AdresseGeoJSONStream
  , PostnummerStream= require("./postnummerstream").PostnummerStream
  , VejnavnStream= require("./vejnavnstream").VejnavnStream
 // , JSONStream= require("JSONStream")
  , JSONStream= require("./jsonstream")
  , JSONPStream= require("./jsonpstream").JSONPStream
  , CsvAdresseStream= require("./csvadressestream").CsvAdresseStream
  , Vejnavn2AdresseStream= require("./vejnavn2adressestream").Vejnavn2AdresseStream;

exports.streamAdresser= function(format, cursor, enadresse, callbackname, response, request) {
  var formatted= request.query.noformat===undefined;
  var mongoadressestream= new MongoAdresseStream(cursor);

  if (format === 'json') {
    var jsonstream= JSONStream.stringify(enadresse?{op:'',sep:'',cl:'\n'}:{op:'[\n',sep:'\n,\n',cl:'\n]\n'},formatted)
    , jsonpstream= new JSONPStream(callbackname,response)
    , adressestream= new AdresseStream({req: request});
    mongoadressestream.pipe(adressestream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
  } else if (format === 'geojson') {
    var jsonstream= JSONStream.stringify({op:'{\n"type": "FeatureCollection",\n"crs": {\n"type": "name",\n"properties": {"name": "EPSG:25832"}\n}\n,"features":[', sep:'\n,\n',cl:']\n}'},formatted)
    , jsonpstream= new JSONPStream(callbackname,response)
    , adressestream= new AdresseStream({req: request})
    , adressegeojsonstream= new AdresseGeoJSONStream({req: request});
    mongoadressestream.pipe(adressestream).pipe(adressegeojsonstream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
  }
  else if (format === 'csv') {
    var csvadressestream= new CsvAdresseStream(response);
    //mongoadressestream.pipe(adressestream).pipe(csvadressestream).pipe(response);
    mongoadressestream.pipe(csvadressestream).pipe(response);
  }
}

exports.streamPostnumre= function(format, cursor, etpostnummer, callbackname, response, request) {
  var formatted= request.query.noformat===undefined;
  var mongopostnummerstream= new MongoPostnummerStream(cursor)
  , postnummerstream= new PostnummerStream();

  if (format === 'json') {
    var jsonstream= JSONStream.stringify(etpostnummer?{op:'',sep:'',cl:'\n'}:{op:'[\n',sep:'\n,\n',cl:'\n]\n'},formatted)
    , jsonpstream= new JSONPStream(callbackname,response);
    mongopostnummerstream.pipe(postnummerstream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
  }
}

exports.streamVejnavne= function(format, cursor, etvejnavn, callbackname, response, request) {
  var formatted= request.query.noformat===undefined;
  var mongovejnavnestream= new MongoVejnavneStream(cursor)
  , vejnavnstream= new VejnavnStream();

  if (format === 'json') {
    var jsonstream= JSONStream.stringify(etvejnavn?{op:'',sep:'',cl:'\n'}:{op:'[\n',sep:'\n,\n',cl:'\n]\n'}, formatted)
    , jsonpstream= new JSONPStream(callbackname,response);
    mongovejnavnestream.pipe(vejnavnstream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
  }
}

exports.streamAutocompleteAdresser= function(format, cursor, enadresse, callbackname, response, request) {
  var formatted= request.query.noformat===undefined;
  var mongovejnavnestream= new MongoVejnavneStream(cursor)
  , vejnavn2adressestream= new Vejnavn2AdresseStream()
  , adressestream= new AdresseStream({req: request});

  if (format === 'json') {
	  var jsonstream= JSONStream.stringify(enadresse?{op:'',sep:'',cl:'\n'}:{op:'[\n',sep:'\n,\n',cl:'\n]\n'}, formatted)
   	, jsonpstream= new JSONPStream(callbackname,response);
	  mongovejnavnestream.pipe(vejnavn2adressestream).pipe(adressestream).pipe(jsonstream).pipe(jsonpstream).pipe(response);
 	}
}
