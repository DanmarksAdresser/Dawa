"use strict";

//TODO https -- needs certificate
//var https        = require('https');
var express        = require('express');
var winston        = require('winston');
var expressWinston = require('express-winston');
var _              = require('underscore');
var ZSchema        = require("z-schema");
var AWS            = require('aws-sdk');
var util           = require('util');


/********************************************************************************
***** Setup *********************************************************************
********************************************************************************/

var dd = new AWS.DynamoDB({apiVersion      : '2012-08-10',
                           region          : 'eu-west-1',
                           accessKeyId     : process.env.accessKeyId,
                           secretAccessKey : process.env.secretAccessKey});

var TABLENAME = process.env.dynamoDBTableName;
var listenPort = process.env.PORT || 3333;

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
  res.send("<h4>Dette er AWS endepunktet for BBR hændelser</h4>"+
           "Brug HTTP POST /haendelse for at afgive en hændelse.<br>"+
           'Mere dokumentation kan findes på '+
           '<a href="https://github.com/DanmarksAdresser/Dawa/tree/master/bbr-facade/doc">'+
           'github.com/DanmarksAdresser/Dawa/tree/master/bbr-facade/doc</a><br>'+
           'Se sekvensnummeret for sidste hændelse her: <a href="/sidsteSekvensnummer">/sidsteSekvensnummer</a>');
});

// Can be used for monitoring
app.get('/sidsteSekvensnummer', function (req, res) {
  getLatest(function(error, latest){
    if (error)
    {
      winston.error('DynamoDB query ERROR: %j %j', error, latest, {});
      res.send(500, error);
    }
    else
    {
      if (latest.Items.length > 0)
      {
        res.send(""+latest.Items[0].seqnr.N);
      }
      else
      {
        res.send("0");
      }
    }
  });
});

app.post('/haendelse', function (req, res) {
  var haendelse = req.body;
  winston.info('Received haendelse: %j', haendelse, {});
  getLatest(function(error, latest){
    if (error)
    {
      winston.error('DynamoDB query ERROR: %j %j', error, latest, {});
      res.send(500, error);
    }
    else
    {
      winston.info('DynamoDB query latest: %j %j', error, latest, {});
      validateSchema(
        haendelse,
        function(error)
        {
          if (error)
          {
            winston.info(error);
            res.send(400, error);
          }
          else
          {
            validateSequenceNumber(haendelse, latest, function(error, exists, seqNr){
              if (error)
              {
                winston.info(error);
                res.send(400, error);
              }
              else
              {
                if (exists)
                {
                  res.send('Hændelse modtaget med sekvensnummer='+seqNr);
                }
                else
                {
                  putItem(seqNr,  haendelse,
                          function(error, data){
                            if (error)
                            {
                              winston.error('DynamoDB put ERROR: %j %j', error, data, {});
                              res.send(500, error);
                            }
                            else
                            {
                              res.send('Hændelse modtaget med sekvensnummer='+seqNr);
                            }
                          });
                }
              }
            });
          }
        });
    }
  });
});

function validateSequenceNumber(haendelse, latest, cb){
  var newSeqNr = parseInt(haendelse.sekvensnummer);
  var len = latest.Items.length;
  var lastSeqNr = parseInt(len > 0 ? latest.Items[0].seqnr.N : '0');
  if (lastSeqNr === newSeqNr)
  {
    var lastJson = JSON.parse(latest.Items[0].data.S);
    if (_.isEqual(haendelse, lastJson))
    {
      cb(null, true, newSeqNr);
    }
    else
    {
      cb({type: 'InputError',
          title: 'Sequence number already known, but event differs',
          details: {text: 'The sequence number exists, but the given event differs from the '+
                    'existing event. Resending of events are allowed, but not changing'+
                    'already send events.',
                    sequenceNumber: lastSeqNr,
                    existingEvent: lastJson,
                    givenEvent: haendelse}});
    }
  }
  else
  {
    if (len === 0 || newSeqNr === (lastSeqNr+1))
    {
      cb(null, false, newSeqNr);
    }
    else
    {
      cb({type: 'InputError',
          title: 'Illegal sequence number',
          details: {text: 'The given sequence number do not match the expected',
                    currentSequenceNumber: lastSeqNr,
                    expectedSequenceNumber: lastSeqNr + 1,
                    givenSequenceNumber: newSeqNr,
                    givenEvent: haendelse}});
    }
  }
}

function putItem(seqNr, data, cb) {
  var item = {key:   {'S': 'haendelser' },
              seqnr: {'N': ''+seqNr },
              data:  {'S': JSON.stringify(data)}};
  winston.info('Putting item: %j', item, {});
  dd.putItem({TableName: TABLENAME,
              Expected: {seqnr: {Exists: false}},
              Item: item},
             function(error, latest){
               if (error)
               {
                 cb({type: 'InternalServerError',
                     title: 'Error querying DynamoDB',
                     details: util.format('Error reading from DynamoDB error=%j data=%j', error, latest)},
                    latest);
               }
               else
               {
                 cb(error, latest);
               }
             });
}

function getLatest(cb) {
  var params = {TableName: TABLENAME,
                KeyConditions: {'key': {ComparisonOperator: 'EQ',
                                        AttributeValueList: [{'S': 'haendelser' }]}},
                ConsistentRead: true,
                ScanIndexForward: false,
                Limit: 1,
               };
  dd.query(params, function(error, latest){
    if (error)
    {
      cb({type: 'InternalServerError',
          title: 'Error querying DynamoDB',
          details: util.format('Error reading from DynamoDB error=%j data=%j', error, latest)},
         latest);
    }
    else
    {
      cb(error, latest);
    }
  });
}


/*******************************************************************************
**** Some more setup. Have to be after the routes ******************************
*******************************************************************************/

app.use(expressWinston.errorLogger({transports: expressLogTransports()}));

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
      return cb({type: 'ValidationError',
                 title: 'Unknown event type',
                 details: 'Unknown event type: '+json.type});
    }
  }
  catch (error){
    if (validator.getLastError().valid === true){
      return cb();
    } else {
      return cb({type: 'ValidationError',
                 title: 'Schema validation error',
                 details: validator.getLastError()});
    }
  }
  return cb();
}

/********************************************************************************
***** Haendelse schemas *********************************************************
********************************************************************************/

var vejnavnsHaendelseSchema = requireAllProperties({
  title : 'Hædelsesskema for vejnavne',
  type  : 'object',
  additionalProperties: false,
  properties : header('vejnavn', {
    kommunekode      : notNull(integer()),
    vejkode          : notNull(integer()),
    navn             : string(),
    adresseringsnavn : string()
  })
});

var adgangsadresseHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for adgangsadresser',
  type  : 'object',
  additionalProperties: false,
  properties : header('adgangsadresse', {
    id                : uuid(),
    vejkode           : notNull(integer()),
    husnummer         : notNull(string()),
    kommunekode       : notNull(integer()),
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
  properties : header('enhedsadresse', {
    id               : uuid(),
    adgangsadresseid : uuid(),
    etage            : string(),
    doer             : string(),
    objekttype       : integer(),
    oprettet         : time(),
    aendret          : time(),
  })
});

var postnummerHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for postnumre',
  type  : 'object',
  additionalProperties: false,
  properties : headerNoAendringstype('postnummer', {
    kommunekode : notNull(integer()),
    vejkode     : notNull(integer()),
    intervaller : notNull(vejstykkeIntervaller())
  })
});

var supplerendebynavnHaendelseSchema = requireAllProperties({
  title : 'Hændelseskema for supplerende bynavne',
  type  : 'object',
  additionalProperties: false,
  properties : headerNoAendringstype('supplerendebynavn', {
    kommunekode : notNull(integer()),
    vejkode     : notNull(integer()),
    intervaller : notNull(vejstykkeIntervaller())
  })
});


/********************************************************************************
***** Schema helper functions ***************************************************
********************************************************************************/

function header(type, data){
  var headerData = headerNoAendringstype(type, data);
  headerData.aendringstype = notNull(enumeration(['aendring','oprettet','nedlagt']));
  return headerData;
}

function headerNoAendringstype(type, data){
  return {type                : notNull(enumeration([type])),
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

function notNull(type){
  if (_.isArray(type.type)){
    type.type = _.filter(type.type, function(val) { return val !== 'null'; });
  }
  if (_.isArray(type.enum)){
    type.enum = _.filter(type.enum, function(val) { return val !== 'null'; });
  }
  return type;
}

function integer()      {return simpleType('integer');}
function number()       {return simpleType('number');}
function string()       {return simpleType('string');}
function time()         {return string();}
function simpleType(t)  {return {type: ['null', t]};}
function array(t)       {return {type: ['null', 'array'], minItems:1, items: t};}
function enumeration(l) {return {enum: ['null'].concat(l)};}
function uuid() {
  return {type: 'string',
          pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'};
}

/********************************************************************************
***** EOF ***********************************************************************
********************************************************************************/
