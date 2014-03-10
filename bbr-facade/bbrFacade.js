"use strict";

//var https        = require('https');
var express        = require('express');
var winston        = require('winston');
var expressWinston = require('express-winston');
var _              = require('underscore');
var ZSchema        = require("z-schema");
var AWS            = require('aws-sdk');

/********************************************************************************
***** Setup *********************************************************************
********************************************************************************/

var dd = new AWS.DynamoDB({apiVersion      : '2012-08-10',
                           region          : 'eu-west-1',
                           accessKeyId     : process.env.accessKeyId,
                           secretAccessKey : process.env.secretAccessKey});

var TABLENAME = process.env.dynamoDBTableName;

var logglyOptions = {subdomain        : 'dawa',
                     inputToken       : process.env.DAWALOGGLY,
                     json             : true,
                     handleExceptions : true};

var app = express();
setupLogging(app);
app.use(express.compress());
app.use(express.bodyParser());


/********************************************************************************
***** Routes ********************************************************************
********************************************************************************/

app.get('/', function (req, res) {
  res.send("Dette er AWS endepunktet for BBR hændelser.<br>"+
           "Brug POST /haendelse for at afgive en hændelse.<br>"+
           'Mere dokumentation kan findes på <a href="http://dawa.aws.dk">dawa.aws.dk</a>');
});

app.post('/haendelse', function (req, res) {
  var haendelse = req.body;
  winston.info('Received haendelse: %j', haendelse, {});
  getLatest(function(error, latest){
    if (error) {
      winston.error('DynamoDB query ERROR: %j %j', error, latest, {});
      return res.send(500, 'Error putting to DynamoDB: '+JSON.stringify([error, latest]));
    } else {
      winston.info('DynamoDB query latest: %j %j', error, latest, {});
      validateSchema(
        haendelse,
        function(error){
          if (error) {
            return res.send(400, error);
          } else {
            var newSequenceNr = parseInt(haendelse.sekvensnummer);
            var len = latest.Items.length;
            var sequenceNr = parseInt(len > 0 ? latest.Items[0].serial.N : '0');
            if (len === 0 || newSequenceNr === (sequenceNr+1)){
              putItem(latest,  newSequenceNr,  haendelse,
                      function(error, data){
                        if (error) {
                          winston.error('DynamoDB put ERROR: %j %j', error, data, {});
                          return res.send(500, 'Error putting to DynamoDB: '+JSON.stringify([error, data]));
                        } else {
                          return res.send('Hændelse modtaget med sekvensnummer='+newSequenceNr);
                        }
                      });
            } else {
              winston.info('Error in sequence-number. The new sequenceNr must be 1+ the old.  old=%s new=%s',
                           sequenceNr, newSequenceNr);
              return res.send(400, 'Fejl: Sekvensnummer forskellig for det forventede.  Modtog: '+newSequenceNr+
                              ', forventede: '+(sequenceNr+1));
            }
          }
        });
    }
  });
});

function putItem(latest, sequenceNr, data, cb) {
  var item = {key:    {'S': 'haendelser' },
              serial: {'N': ''+sequenceNr },
              data:   {'S': JSON.stringify(data)}};
  winston.info('Putting item: %j', item, {});
  dd.putItem({TableName: TABLENAME, Item: item},
             cb);
}

function getLatest(cb) {
  var params = {TableName: TABLENAME,
                KeyConditions: {'key': {ComparisonOperator: 'EQ',
                                        AttributeValueList: [{'S': 'haendelser' }]}},
                ConsistentRead: true,
                ScanIndexForward: false,
                Limit: 1,
               };
  dd.query(params, cb);
}


/*******************************************************************************
**** Some more setup. Have to be after the routes ******************************
*******************************************************************************/

app.use(expressWinston.errorLogger({transports: expressLogTransports()}));

var listenPort = process.env.PORT || 3333;
app.listen(listenPort);
//TODO HTTPS,  need certificate!
//https.createServer(app).listen(listenPort);

winston.info("Express server listening on port %d in %s mode", listenPort, app.settings.env);


/*******************************************************************************
**** Helper functions **********************************************************
*******************************************************************************/

function setupLogging(app){
  require('winston-loggly');
  if (process.env.DAWALOGGLY){
    winston.add(winston.transports.Loggly, logglyOptions);
    winston.info("Production mode. Setting up Loggly logging %s", process.env.DAWALOGGLY);
  }
  app.use(expressWinston.logger({transports: expressLogTransports()}));
  winston.handleExceptions(new winston.transports.Console());
}

function expressLogTransports(){
  var transports = [];
  if (process.env.DAWALOGGLY){
    transports.push(new winston.transports.Loggly(logglyOptions));
  }
  transports.push(new winston.transports.Console());
  return transports;
}

var validator = new ZSchema({ sync: true });
function validateSchema(json, cb){
  var validate = function(schema){
    if (!validator.validate(json, schema)) {
      throw validator.getLastError();
    }
  };

  try {
    switch (json.type) {
    case 'enhedsadresse'     : validate(enhedsadresseHaendelseSchema)     ; break;
    case 'vejnavn'           : validate(vejnavnsHaendelseSchema)          ; break;
    case 'supplerendebynavn' : validate(supplerendebynavnHaendelseSchema) ; break;
    case 'postnummer'        : validate(postnummerHaendelseSchema)        ; break;
    case 'adgangsadresse'    : validate(adgangsadresseHaendelseSchema)    ; break;
    default:
      return cb('Ukendt hændelses type: '+json.type);
    }
  }
  catch (error){
    if (validator.getLastError().valid === true){
      return cb();
    } else {
      return cb(validator.getLastError());
    }
  }
  return cb();
}

/********************************************************************************
***** Haendelse schemas *********************************************************
********************************************************************************/
// TODO: which fields are nullable?

var vejnavnsHaendelseSchema = requireAllProperties({
  title : 'Hædelsesskema for vejnavne',
  type  : 'object',
  additionalProperties: false,
  properties : haendelsesHeader('vejnavn', {
    kommunekode      : integer(),
    vejkode          : integer(),
    navn             : string(),
    adresseringsnavn : string()
  })
});

var adgangsadresseHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for adgangsadresser',
  type  : 'object',
  additionalProperties: false,
  properties : haendelsesHeader('adgangsadresse', {
    id: uuid(),
    vejkode           : integer(),
    husnummer         : string(),
    kommunekode       : integer(),
    landsejerlav_kode : integer(),
    landsejerlav_navn : string(),
    matrikelnr        : string(),
    esrejendomsnr     : string(),
    postnummer        : integer(),
    postdistrikt      : string(),
    supplerendebynavn : string(),
    objekttype        : integer(),
    oprettet          : time(),
    aendret           : time(),
    adgangspunkt_id                     : uuid(),
    adgangspunkt_kilde                  : string(),
    adgangspunkt_noejagtighedsklasse    : string(),
    adgangspunkt_tekniskstandard        : string(),
    adgangspunkt_retning                : number(),
    adgangspunkt_placering              : string(),
    adgangspunkt_revisionsdato          : time(),
    adgangspunkt_etrs89koordinat_oest   : number(),
    adgangspunkt_etrs89koordinat_nord   : number(),
    adgangspunkt_wgs84koordinat_bredde  : number(),
    adgangspunkt_wgs84koordinat_laengde : number(),
    DDKN_m100 : string(),
    DDKN_km1  : string(),
    DDKN_km10 : string()
  })
});


var enhedsadresseHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for enhedsadresser',
  type  : 'object',
  additionalProperties: false,
  properties : haendelsesHeader('enhedsadresse', {
    id               : uuid(),
    adgangsadresseid : uuid(),
    etage            : simpleType(['string', 'null']),
    doer             : simpleType(['string', 'null']),
    objekttype       : integer(),
    oprettet         : time(),
    aendret          : time(),
  })
});

var postnummerHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for postnumre',
  type  : 'object',
  additionalProperties: false,
  properties : haendelsesHeaderNoAendringstype('postnummer', {
    kommunekode : integer(),
    vejkode     : integer(),
    intervaller : vejstykkeIntervaller()
  })
});

var supplerendebynavnHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for supplerende bynavne',
  type  : 'object',
  additionalProperties: false,
  properties : haendelsesHeaderNoAendringstype('supplerendebynavn', {
    kommunekode: integer(),
    vejkode: integer(),
    intervaller : vejstykkeIntervaller()
  })
});


/********************************************************************************
***** Schema helper functions ***************************************************
********************************************************************************/

function haendelsesHeader(type, data){
  var header = haendelsesHeaderNoAendringstype(type, data);
  header.aendringstype = enumeration(['aendring','oprettet','nedlagt']);
  return header;
}

function haendelsesHeaderNoAendringstype(type, data){
  return {type                : enumeration([type]),
          sekvensnummer       : integer(),
          lokaltsekvensnummer : integer(),
          tidspunkt           : time(),
          data                : requireAllProperties({type: 'object',
                                                      additionalProperties: false,
                                                      properties: data})
         };
}

function requireAllProperties(object){
  var properties = _.keys(object.properties);
  object.required = properties;
  return object;
}

function vejstykkeIntervaller(){
  return array(requireAllProperties(
    {type: 'object',
     additionalProperties: false,
     properties: {husnrFra : string(),
                  husnrTil : string,
                  side     : enumeration(['lige','ulige']),
                  nummer   : integer()}}));
}

function integer()      {return simpleType('integer');}
function number()       {return simpleType('number');}
function string()       {return simpleType('string');}
function time()         {return string();}
function simpleType(t)  {return {type: t};}
function array(t)       {return {type: 'array', minItems:1, items: t};}
function enumeration(l) {return {'enum': l};}
function uuid() {
  return {type: 'string',
          pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'};
}

/********************************************************************************
***** EOF ***********************************************************************
********************************************************************************/
