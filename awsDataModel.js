'use strict';

var ZSchema = require("z-schema");

var definitions = {
  'UUID' : {type: 'string', pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
  'Etage': {type: 'string', pattern: '^([1-9]|[1-9][0-9]|st|kl[0-9]?)$'},
  'DateTime': {type: 'string'} // TODO: find the correct format.
};

var adresseSchema = {
  'title': 'Adresse',
  'type': 'object',
  'properties': {
    'id': { '$ref': '#/definitions/UUID' },
    'etage': { '$ref': '#/definitions/Etage' },
    'dør': { type: 'string' },
    'adressebetegnelse': { type: 'string' },
    'adgangsadresse': { type: 'string' }
  },
  'required': ['id', 'adressebetegnelse', 'adgangsadresse'],
  'definitions': definitions
};

var postnummerSchema =  {
  'title': 'postnummer',
  'type': 'object',
  'properties': {
    'nr'      : { type: 'string', pattern: '^\\d{4}$'},
    'navn'    : { type: 'string', maxLength: 20 },
    'version' : { '$ref': '#/definitions/DateTime' }
  },
  'required': ['nr', 'navn', 'version'],
  'definitions': definitions
};

var zSchemaValidator = new ZSchema({noZeroLengthStrings: true,
  noExtraKeywords: true,
  forceItems: true,
  forceProperties: true});

function makeValidator(schema) {
  return function(object) {
    return zSchemaValidator.validate(object, schema);
  };
}

/**
 * A model consists of:
 * name : the name of the 'class'
 * plural : plural version of the name
 * schema: the schema that validates an object
 * key: The unique key property
 * validate: a function that validates an object against the schema
 */
module.exports = {
  adresse : {
    name: 'adresse',
    plural : 'adresser',
    schema : adresseSchema,
    key : 'id',
    validator: makeValidator(adresseSchema)
  },
  postnummer : {
    name: 'postnummer',
    plural: 'postnumre',
    schema: postnummerSchema,
    key: 'nr',
    validate: makeValidator(postnummerSchema)
  }
};

