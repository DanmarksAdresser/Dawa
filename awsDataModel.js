
'use strict'

var definitions = {
  'UUID' : {type: 'string', pattern: '^([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})$'},
  'Etage': {type: 'string', pattern: '^([1-9]|[1-9][0-9]|st|kl[0-9]?)$'},
  'DateTime': {type: 'string'} // TODO: find the correct format.
};

exports.adresseSchema = {
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

exports.postnummerSchema =  {
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
