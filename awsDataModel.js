'use strict';
var _       = require("underscore");
var ZSchema = require("z-schema");


/******************************************************************************/
/*** Helper functions *********************************************************/
/******************************************************************************/

function object_AllRequired(properties){
  return   {type: 'object',
            properties: properties,
            required: _.keys(properties),
            additionalProperties: false};
}

var zSchemaValidator = new ZSchema({noZeroLengthStrings: true,
                                    noExtraKeywords: true,
                                    forceItems: true,
                                    forceProperties: true});

function makeValidator(schema) {
  return function(object) {
    return zSchemaValidator.validate(object, schema);
  };
}


/******************************************************************************/
/*** JSON-Schema definitions **************************************************/
/******************************************************************************/

var definitions = {
  'UUID' : {type: 'string', pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
  'Etage': {type: 'string', pattern: '^([1-9]|[1-9][0-9]|st|kl[1-9]?)$'},
  'Kode4': {type: 'string', pattern: '^(\\d{4})$'},
  'UpTo8': {type: 'string', pattern: '^\\d{1,8}$'},
  'DateTime': {type: 'string'}, // TODO: find the correct format.
  'Wgs84koordinat': object_AllRequired({'bredde': {type: 'number'}, // TODO: can we add ranges?
                                        'længde': {type: 'number'}}), // TODO: can we add ranges?
  'Etrs89koordinat': object_AllRequired({'øst':  {type: 'number'}, // TODO: can we add ranges?
                                         'nord': {type: 'number'}}), // TODO: can we add ranges?
};

var adgangsAdresseSchema = {
  title: 'AdgangsAdresse',
  type: 'object',
  properties: {
    'id'     : { '$ref': '#/definitions/UUID' },
    'version': { '$ref': '#/definitions/DateTime' },  // TODO: a version should not be a timestamp!
    'vej'    : object_AllRequired({'kode': { '$ref': '#/definitions/Kode4' },
                                   'navn': { type: 'string', maxLength: 40}}), //TODO 'vejadresseringsnavn': { type: 'string', maxLength: 20}}),
    'husnr'  : {type: 'string', pattern: '([1-9]|[1-9]\\d|[1-9]\\d{2})[A-Z]?'}, // todo: is this pattern too restrictive? only up to 999
    'supplerendebynavn': { type: 'string', maxLength: 34},
    'postnummer': object_AllRequired({'nr'  : { '$ref': '#/definitions/Kode4' },
                                      'navn': { type: 'string', maxLength: 20}}),
    'kommune': object_AllRequired({'kode': { '$ref': '#/definitions/Kode4' },
                                   'navn': { type: 'string'}}), // todo: what is the maxLength?
    'ejerlav': object_AllRequired({'kode': { '$ref': '#/definitions/UpTo8' },
                                   'navn': { type: 'string'}}), // todo: what is the maxLength?
    'matrikelnr': { type: 'string', pattern: '^[0-9a-zæøå]{1,7}$'}, // TODO: can we strengthen this pattern?
    'historik'  : object_AllRequired({'oprettet': {'$ref': '#/definitions/DateTime' },
                                      'ændret'  : {'$ref': '#/definitions/DateTime' }}),
    'adgangspunkt': object_AllRequired({'etrs89koordinat': {'$ref': '#/definitions/Etrs89koordinat' },
                                        'wgs84koordinat' : {'$ref': '#/definitions/Wgs84koordinat' },
                                        'kvalitet'       : object_AllRequired({'nøjagtighed'    : {type: 'string', pattern: '^A|B|U$' },
                                                                               'kilde'          : {type: 'integer', minimum: 1, maximum: 5},
                                                                               'tekniskstandard': {type: 'string',
                                                                                                   pattern: '^TD|TK|TN|UF$' }}),
                                        'tekstretning'   : {type: 'number', minimum: 0, maximum: 400},
                                        'ændret'        : {'$ref': '#/definitions/DateTime' }}),
    'DDKN': object_AllRequired({'m100': {type: 'string', pattern: '100m_(\\d{5})_(\\d{4})'}, //, $1 range?, $2 range?}},
                                'km1' : {type: 'string', pattern:  '1km_(\\d{4})_(\\d{3})'}, //, $1 range?, $2 range?}},
                                'km10': {type: 'string', pattern: '10km_(\\d{3})_(\\d{2})'}}), //, $1 range?, $2 range?}},
    'sogn': object_AllRequired({'kode': { type: 'string'},   //todo: pattern?
                                'navn': { type: 'string'}}), //todo: pattern?
    'region': object_AllRequired({'kode': { type: 'string'},   //todo: pattern?
                                  'navn': { type: 'string'}}), //todo: pattern?
    'retskreds': object_AllRequired({'kode': { type: 'string'},   //todo: pattern?
                                     'navn': { type: 'string'}}), //todo: pattern?
    'politikreds': object_AllRequired({'kode': { type: 'string'},   //todo: pattern?
                                       'navn': { type: 'string'}}), //todo: pattern?
    'opstillingskreds': object_AllRequired({'kode': { type: 'string'},   //todo: pattern?
                                            'navn': { type: 'string'}}), //todo: pattern?
    'afstemningsområde': object_AllRequired({'kode': { type: 'string'},   //todo: pattern?
                                             'navn': { type: 'string'}})  //todo: pattern?
  },
  required: ['id'],// TODO: insert required
  additionalProperties: false,
  definitions: definitions
};

var adresseSchema = {
  'title': 'Adresse',
  'type': 'object',
  'properties': {
    'id':      { '$ref': '#/definitions/UUID' },
    'version': { '$ref': '#/definitions/DateTime' },  // TODO: a version should not be a timestamp!
    'etage':   { '$ref': '#/definitions/Etage' },
    'dør':     { type: 'string' },
    'adressebetegnelse': { type: 'string' },
    // Here we just reuse the JS definition above.  If schemas get
    // public URLs, those should be used instead!
    'adgangsadresse': adgangsAdresseSchema,
  },
  'required': ['id', 'adressebetegnelse', 'adgangsadresse'],
  'additionalProperties': false,
  'definitions': definitions
};

var postnummerSchema =  {
  'title': 'postnummer',
  'type': 'object',
  'properties': {
    'nr'      : { type: 'string', pattern: '^\\d{4}$'},
    'navn'    : { type: 'string', maxLength: 20 },
    'version' : { '$ref': '#/definitions/DateTime' },
    'stormodtageradresse': { type: 'string'}, // TODO: format?
    'regioner': {type: 'array',
                 items: { type: 'string'}}, //todo: pattern?
    'kommuner': {type: 'array',
                 items: { '$ref': '#/definitions/Kode4'}},
  },
  'required': ['nr', 'navn', 'version'],
  'additionalProperties': false,
  'definitions': definitions
};

var vejnavnSchema = {
  'title': 'vejnavn',
  'type': 'object',
  'properties': {
    'kommunekode': { type: 'string'}, // todo: pattern?
    'kode': { '$ref': '#/definitions/Kode4'},
    'navn' : { type: 'string', maxLength: 40},
//    'vejadresseringsnavn' : { type: 'string', maxLength: 20},
    'postnumre': {type: 'array',
                 items: { '$ref': '#/definitions/Kode4'}},
  },
  'required': ['kode', 'kommunekode', 'navn'],// TODO
  'additionalProperties': false,
  'definitions': definitions
}

var supplerendebynavnSchema = {
  'title': 'supplerendebynavn',
  'type': 'object',
  'properties': {
    'version': { '$ref': '#/definitions/DateTime'},
    'navn' : { type: 'string', maxLength: 34},
    'postnumre': {type: 'array',
                 items: { '$ref': '#/definitions/Kode4'}},
    'regioner': {type: 'array',
                 items: { type: 'string'}}, //todo: pattern?
    'kommuner': {type: 'array',
                 items: { '$ref': '#/definitions/Kode4'}},
  },
  'required': ['version','navn'],// TODO
  'additionalProperties': false,
  'definitions': definitions
}


/******************************************************************************/
/*** Data Model definitions ***************************************************/
/******************************************************************************/

// A model consists of:
//   name : the name of the 'class'
//   plural : plural version of the name
//   schema: the schema that validates an object
//   key: The unique key property
//   validate: a function that validates an object against the schema

module.exports = {
  adresse : {
    name: 'adresse',
    plural : 'adresser',
    schema : adresseSchema,
    key : 'id',
    validator: makeValidator(adresseSchema)
  },

  adgangsadresse : {
    name: 'adgangsadresse',
    plural : 'adgangsadresser',
    schema : adgangsAdresseSchema,
    key : 'id',
    validator: makeValidator(adgangsAdresseSchema)
  },

  postnummer : {
    name: 'postnummer',
    plural: 'postnumre',
    schema: postnummerSchema,
    key: 'nr',
    validate: makeValidator(postnummerSchema)
  },

  vejnavn : {
    name: 'vejnavn',
    plural: 'vejnavne',
    schema: vejnavnSchema,
    key: 'kode',
    validate: makeValidator(vejnavnSchema)
  },

  supplerendebynavn : {
    name: 'supplerendebynavn',
    plural: 'supplerendebynavne',
    schema: supplerendebynavnSchema,
    key: 'navn', // TODO: this is not a key!!!!
    validate: makeValidator(supplerendebynavnSchema)
  },
};

/******************************************************************************/
/*** EOF **********************************************************************/
/******************************************************************************/
