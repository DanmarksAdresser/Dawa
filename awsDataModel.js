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

function compileSchema(schema) {
  return new ZSchema().compileSchemasSync([schema])[0];
}
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
  'Href' : {
    type: 'string'
  },
  'Etage': {type: 'string', pattern: '^([1-9]|[1-9][0-9]|st|kl[1-9]?)$'},
  'Kode4': {type: 'integer', pattern: '^(\\d{4})$'},
  'UpTo8': {type: 'string', pattern: '^\\d{1,8}$'},
  'DateTime': {type: 'string'}, // TODO: find the correct format.
  'Wgs84koordinat': object_AllRequired({'bredde': {type: 'number'}, // TODO: can we add ranges?
                                        'længde': {type: 'number'}}), // TODO: can we add ranges?
  'Etrs89koordinat': object_AllRequired({'øst':  {type: 'number'}, // TODO: can we add ranges?
                                         'nord': {type: 'number'}}), // TODO: can we add ranges?
  Postnr: {
    type: 'integer',
    minimum: 1000,
    maximum: 9999
  },
  PostnummerRef: {
    type: 'object',
    properties: {
      href: {
        description: 'Postnummerets unikke URL',
        type: 'string'
      },
      nr: {
        description: 'Postnummer',
        '$ref': '#/definitions/Postnr'
      },
      navn: {
        description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn. Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.',
        type: 'string'
      }
    },
    required: ['href', 'nr'],
    additionalProperties: false,
    docOrder: ['href', 'nr', 'navn']
  },
  KommuneRef: {
    type: 'object',
    properties: {
      href: {
        description: 'Kommunens unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Kommunekoden. 4 cifre.',
        '$ref': '#/definitions/Kode4'
      },
      navn: {
        description: 'Kommunens navn.',
        type: 'string'
      },
    },
    required: ['href', 'kode' ],
    additionalProperties: false,
    docOrder: ['href', 'kode', 'navn']
  }
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
    'href': {
      description: 'Postnummerets unikke URL.',
      '$ref': '#/definitions/Href'
    },
    'nr'      : {
      description: 'Unik identifikation af det postnummer som postnummern er beliggende i. Postnumre fastsættes af Post Danmark. Repræsenteret ved fire cifre. Eksempel: ”2400” for ”København NV”.',
      '$ref': '#/definitions/Postnr'
    },
    'navn'    : {
      description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn. Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.',
      type: 'string',
      maxLength: 20
    },
    'version' : {
      '$ref': '#/definitions/DateTime'
    },
    'stormodtageradresse': {
      description: 'Hvis postnummeret er et stormodtagerpostnummer rummer feltet adressen på stormodtageren.',
      type: 'string'
    },
    'kommuner': {
      description: 'De kommuner hvis areal overlapper postnumeret areal.',
      type: 'array',
      items: {
        '$ref': '#/definitions/KommuneRef'
      }
    }
  },
  'required': ['href','nr', 'navn', 'version', 'kommuner'],
  'docOrder': ['href','nr', 'navn', 'version', 'stormodtageradresse', 'kommuner'],
  'additionalProperties': false,
  'definitions': definitions
};

var vejstykkeSchema = {
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
  };

var vejnavnSchema = {
  'title': 'vejnavnnavn',
  'type': 'object',
  'properties': {
    'vejnavn': { type: 'string'}
  }
};

var supplerendebynavnSchema = {
  'title': 'supplerendebynavn',
  'type': 'object',
  'properties': {
    href: {
      description: 'Det supplerende bynavns unikke URL',
      $ref: '#/definitions/Href'
    },
    'navn': {
      description: 'Det supplerende bynavn. Indtil 34 tegn. Eksempel: ”Sønderholm”.',
      type: 'string',
      maxLength: 34
    },
    'postnumre': {
      description: 'Postnumre, som det supplerende bynavn er beliggende i.',
      type: 'array',
      items: { '$ref': '#/definitions/PostnummerRef'}
    },
    'kommuner': {
      description: 'Kommuner, som det supplerende bynavn er beliggende i.',
      type: 'array',
      items: { '$ref': '#/definitions/KommuneRef'}
    }
  },
  'required': ['href', 'navn', 'postnumre', 'kommuner'],
  'docOrder': ['href', 'navn', 'kommuner', 'postnumre'],
  'additionalProperties': false,
  'definitions': definitions
};

var kommuneSchema = {
  'title': 'kommune',
  'type': 'object',
  'properties': {
    'kode': { type: 'integer',  maximum: 9999},
    'navn' : { type: 'string'},
  },
  'required': ['kode', 'navn'],
  'additionalProperties': false,
};


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
    schema : compileSchema(adresseSchema),
    key : 'id',
    validate: makeValidator(adresseSchema)
  },

  adgangsadresse : {
    name: 'adgangsadresse',
    plural : 'adgangsadresser',
    schema : compileSchema(adgangsAdresseSchema),
    key : 'id',
    validate: makeValidator(adgangsAdresseSchema)
  },

  postnummer : {
    name: 'postnummer',
    plural: 'postnumre',
    schema: compileSchema(postnummerSchema),
    key: 'nr',
    validate: makeValidator(postnummerSchema)
  },

  vejstykke : {
    name: 'vejstykke',
    plural: 'vejstykker',
    table: 'vejstykkerView',
    schema: compileSchema(vejstykkeSchema),
    key: ['kommunekode','kode'],
    validate: makeValidator(vejstykkeSchema)
  },

  vejnavn: {
    name: 'vejnavn',
    plural: 'vejnavne',
    schema: compileSchema(vejnavnSchema),
    key: 'navn',
    validate: makeValidator(vejnavnSchema)
  },

  supplerendebynavn : {
    name: 'supplerendebynavn',
    plural: 'supplerendebynavne',
    schema: compileSchema(supplerendebynavnSchema),
    key: 'navn', // TODO: this is not a key!!!!
    validate: makeValidator(supplerendebynavnSchema)
  },

  kommune : {
    name: 'kommune',
    plural: 'kommuner',
    table: 'kommuner',
    schema: compileSchema(kommuneSchema),
    key: 'kommunekode',
    validate: makeValidator(kommuneSchema)
  }

};

/******************************************************************************/
/*** EOF **********************************************************************/
/******************************************************************************/
