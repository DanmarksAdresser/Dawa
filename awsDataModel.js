'use strict';
var _       = require("underscore");
var ZSchema = require("z-schema");


/******************************************************************************/
/*** Helper functions *********************************************************/
/******************************************************************************/
function nullableType(type) {
  return [type, 'null'];
}

function nullable(schemaType) {
  var result = _.clone(schemaType);
  result.type = nullableType(schemaType.type);
  return result;
}

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
  'DateTime': {
    type: 'string'
  }, // TODO: find the correct format.
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
        type: nullableType('string')
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
        type: nullableType('string')
      }
    },
    required: ['href', 'kode' ],
    additionalProperties: false,
    docOrder: ['href', 'kode', 'navn']
  },
  VejstykkeKodeOgNavn: {
    type: 'object',
    properties: {
      href: {
        description: 'Vejstykkets unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Identifikation af det vejstykket. Er unikt indenfor den pågældende kommune. Repræsenteret ved fire cifre. Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.',
        '$ref': '#/definitions/Kode4'
      },
      navn: {
        description: 'Vejens navn.',
        type: 'string'
      }
    },
    required: ['href', 'kode' ],
    additionalProperties: false,
    docOrder: ['href', 'kode', 'navn']
  }
};

definitions.NullableDateTime = nullable(definitions.DateTime);

var adgangsAdresseSchema = {
  title: 'AdgangsAdresse',
  type: 'object',
  properties: {
    href: {
      description: 'Adgangsadressens URL.',
      $ref: '#/definitions/Href'
    },
    'id'     : {
      description: 'Universel, unik identifikation af adressen af datatypen UUID. ' +
        'Er stabil over hele adressens levetid (ligesom et CPR-nummer) ' +
        'dvs. uanset om adressen evt. ændrer vejnavn, husnummer, postnummer eller kommunekode. ' +
        'Repræsenteret som 32 hexadecimale tegn. Eksempel: ”0a3f507a-93e7-32b8-e044-0003ba298018”.',
      '$ref': '#/definitions/UUID'
    },
    'vejstykke'    : {
      description: 'Vejstykket som adressen er knyttet til. Udgår og bliver erstattet af Navngiven vej.',
      $ref: '#/definitions/VejstykkeKodeOgNavn'
    },
    'husnr'  : {
      description: 'Husnummer, som der identificerer den pågældende adresse i forhold til andre adresser med samme vejnavn.' +
        ' Husnummeret består af et tal 1-999 evt. suppleret af et stort bogstav A..Z, og fastsættes i stigende orden, ' +
        'normalt med lige og ulige numre på hver side af vejen. Eksempel: "11", "12A", "187B".',
      type: 'string',
      pattern: '([1-9]|[1-9]\\d|[1-9]\\d{2})[A-Z]?'
    },
    'bygningsnavn': {
      description: '',
      type: nullableType('string')
    },
    'supplerendebynavn': {
      description: 'Et supplerende bynavn – typisk landsbyens navn – eller andet lokalt stednavn der er fastsat af ' +
        'kommunen for at præcisere adressens beliggenhed indenfor postnummeret. ' +
        'Indgår som en del af den officielle adressebetegnelse. Indtil 34 tegn. Eksempel: ”Sønderholm”.',
      type: nullableType('string'), maxLength: 34
    },
    'postnummer': {
      description: 'Postnummeret som adressen er beliggende i.',
      $ref: '#/definitions/PostnummerRef'
    },
    'kommune':{
      description: 'Kommunen som adressen er beliggende i.',
      $ref: '#/definitions/KommuneRef'
    },
    'ejerlav': {
      type: nullableType('object'),
      description: 'Det matrikulære ejerlav som adressen ligger i.',
      properties: {
        'kode': {
          description: 'Unik identifikation af det matrikulære ”ejerlav”, som adressen ligger i. ' +
            'Repræsenteret ved indtil 8 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.',
          '$ref': '#/definitions/UpTo8'
        },
        'navn': {
          description: 'Det matrikulære ”ejerlav”s navn. Eksempel: ”Eskebjerg By, Bregninge”.',
          type: 'string'
        },
        required: ['kode', 'navn'],
        additionalProperties: false,
        docOrder: ['kode', 'navn']
      }
    },
    'matrikelnr': {
      description: 'Betegnelse for det matrikelnummer, dvs. jordstykke, som adressen er beliggende på. ' +
        'Repræsenteret ved Indtil 7 tegn: max. 4 cifre + max. 3 små bogstaver. Eksempel: ”18b”.',
      type: nullableType('string'),
      pattern: '^[0-9a-zæøå]{1,7}$'
    },
    'esrejendomsnr': {
      description: 'Identifikation af den vurderingsejendom jf. Ejendomsstamregisteret, ' +
        'ESR, som det matrikelnummer som adressen ligger på, er en del af. ' +
        'Repræsenteret ved seks cifre. Eksempel ”001388”.',
      type: 'string',
      pattern: '^[0-9]{1,6}'
    },
    'historik'  : {
      'description': 'Væsentlige tidspunkter for adressen',
      properties: {
        'oprettet': {
          description: 'Dato og tid for adressens oprettelse. Eksempel: 2001-12-23T00:00:00.',
          '$ref': '#/definitions/NullableDateTime'
        },
        'ikrafttrædelse': {
          description: 'Dato og tid for adressens ikrafttrædelse. Eksempel: 2002-01-01T00:00:00.',
          '$ref': '#/definitions/NullableDateTime'
        },
        'ændret': {
          description: 'Dato og tid hvor der sidst er ændret i adressen. Eksempel: 2002-04-08T00:00:00.',
          type: nullableType('string'),
          '$ref': '#/definitions/NullableDateTime'
        },
        additionalProperties: false,
        docOrder: ['oprettet', 'ikrafttrædelse', 'ændret']
      }
    },
    'adgangspunkt': {
      type: 'object',
      description: 'Geografisk punkt, som angiver særskilt adgang fra navngiven vej ind på et areal eller bygning.',
      properties: {
        etrs89koordinat: {
          description: 'Adgangspunktets koordinatsæt angivet i koordinatsystemet ' +
            'UTM zone 32 og ved brug af fælles europæiske terrestriale referencesystem EUREF89/ETRS89.',
          $ref: '#/definitions/Etrs89koordinat'
        },
        wgs84koordinat: {
          description: 'Adgangspunktets koordinatsæt angivet i koordinatsystemet WGS84/geografisk.',
          $ref: '#/definitions/Wgs84koordinat'
        },
        nøjagtighed: {
          description: 'Kode der angiver nøjagtigheden for adressepunktet. ' +
            'Et tegn. ”A” betyder at adressepunktet er absolut placeret på et detaljeret grundkort, ' +
            'tyisk med en nøjagtighed bedre end +/- 2 meter. ”B” betyder at adressepunktet er beregnet – ' +
            'typisk på basis af matrikelkortet, således at adressen ligger midt på det pågældende matrikelnummer. ' +
            'I så fald kan nøjagtigheden være ringere en end +/- 100 meter afhængig af forholdene. ' +
            '”U” betyder intet adressepunkt.',
          type: 'string',
          pattern: '^A|B|U$'
        },
        kilde: {
          description: 'Kode der angiver kilden til adressepunktet. Et tegn. ' +
            '”1” = oprettet maskinelt fra teknisk kort; ' +
            '”2” = Oprettet maskinelt fra af matrikelnummer tyngdepunkt; ' +
            '”3” = Eksternt indberettet af konsulent på vegne af kommunen; ' +
            '”4” = Eksternt indberettet af kommunes kortkontor o.l. ' +
            '”5” = Oprettet af teknisk forvaltning."',
          type: 'integer', minimum: 1, maximum: 5

        },
        tekniskstandard: {
          description: 'Kode der angiver den specifikation adressepunktet skal opfylde. 2 tegn. ' +
            '”TD” = 3 meter inde i bygningen ved det sted hvor indgangsdør e.l. skønnes placeret; ' +
            '”TK” = Udtrykkelig TK-standard: 3 meter inde i bygning, midt for længste side mod vej; ' +
            '”TN” Alm. teknisk standard: bygningstyngdepunkt eller blot i bygning; ' +
            '”UF” = Uspecificeret/foreløbig: ikke nødvendigvis placeret i bygning."',
          type: 'string',
          pattern: '^TD|TK|TN|UF$'
        },
        tekstretning: {
          description: 'Angiver en evt. retningsvinkel for adressen i ”gon” ' +
            'dvs. hvor hele cirklen er 400 gon og 200 er vandret. ' +
            'Værdier 0.00-400.00: Eksempel: ”128.34”.',
          type: 'number',
          minimum: 0,
          maximum: 400
        },
        ændret: {
          description: 'Dato og tid for sidste ændring i adressepunktet. Eksempel: ”1998-11-17T00:00:00”',
          '$ref': '#/definitions/DateTime'
        }
      },
      additionalProperties: false,
      docOrder: ['etrs89koordinat', 'wgs84koordinat','nøjagtighed','kilde', 'tekniskstandard','tekstretning', 'ændret']
    },
    'DDKN': {
      type: 'object',
      description: 'Adressens placering i Det Danske Kvadratnet (DDKN).',
      properties: {
        'm100': {
          description: 'Angiver betegnelsen for den 100 m celle som adressen er beliggende i. 15 tegn. Eksempel: ”100m_61768_6435”.',
          type: 'string',
          pattern: '^100m_(\\d{5})_(\\d{4})$'
        },
        'km1' : {
          description: 'Angiver betegnelsen for den 1 km celle som adressen er beliggende i. 12 tegn. Eksempel: ”1km_6176_643”.',
          type: 'string',
          pattern:  '^1km_(\\d{4})_(\\d{3})$'
        },
        'km10': {
          description: 'Angiver betegnelsen for den 10 km celle som adressen er beliggende i. 11 tegn. Eksempel: ”10km_617_64”.',
          type: 'string',
          pattern: '^10km_(\\d{3})_(\\d{2})$'
        }
      },
      docOrder: ['m100', 'km1', 'km10']
    },
    'sogn': {
      type: 'object',
      description: 'Sognet som adressen er beliggende i.',
      properties: {
        nr: {
          description: 'Identifikation af sognet',
          type: 'integer'
        },
        navn: {
          description: 'Sognets navn',
          type: 'string'
        }
      },
      required: ['nr', 'navn'],
      additionalProperties: false,
      docOrder: ['nr', 'navn']
    },
    'region': {
      type: 'object',
      description: 'Regionen som adressen er beliggende i.',
      properties: {
        nr: {
          description: 'Identifikation af regionen',
          type: 'integer'
        },
        navn: {
          description: 'Regionens navn',
          type: 'string'
        }
      },
      required: ['nr', 'navn'],
      additionalProperties: false,
      docOrder: ['nr', 'navn']
    },
    'retskreds': {
      type: 'object',
      description: 'Retskredsen som adressen er beliggende i.',
      properties: {
        nr: {
          description: 'Identifikation af retskredsen',
          type: 'integer'
        },
        navn: {
          description: 'Retskredsens navn',
          type: 'string'
        }
      },
      required: ['nr', 'navn'],
      additionalProperties: false,
      docOrder: ['nr', 'navn']
    },
    'politikreds': {
      type: 'object',
      description: 'Politikredsen som adressen er beliggende i.',
      properties: {
        nr: {
          description: 'Identifikation af politikredsen',
          type: 'integer'
        },
        navn: {
          description: 'Politikredsens navn',
          type: 'string'
        }
      },
      required: ['nr', 'navn'],
      additionalProperties: false,
      docOrder: ['nr', 'navn']
    },
    'opstillingskreds': {
      type: 'object',
      description: 'Opstillingskresen som adressen er beliggende i.',
      properties: {
        nr: {
          description: 'Identifikation af opstillingskredsen',
          type: 'integer'
        },
        navn: {
          description: 'Opstillingskredsens navn',
          type: 'string'
        }
      },
      required: ['nr', 'navn'],
      additionalProperties: false,
      docOrder: ['nr', 'navn']
    },
    'afstemningsområde': {
      type: 'object',
      description: 'Afstemningsområde som adressen er beliggende i.',
      properties: {
        nr: {
          description: 'Identifikation af afstemningsområdet',
          type: 'integer'
        },
        navn: {
          description: 'Afstemningsområdet navn',
          type: 'string'
        }
      },
      required: ['nr', 'navn'],
      additionalProperties: false,
      docOrder: ['nr', 'navn']
    }
  },
  required: ['href','id', 'vejstykke', 'husnr', 'bygningsnavn', 'supplerendebynavn','postnummer', 'kommune','historik'],
  docOrder: ['href','id', 'vejstykke', 'husnr','bygningsnavn', 'supplerendebynavn',
    'postnummer','kommune', 'ejerlav', 'matrikelnr','esrejendomsnr', 'historik',
  'adgangspunkt', 'DDKN', 'sogn','region','retskreds','politikreds','opstillingskreds','afstemningsområde'],
  additionalProperties: false,
  definitions: definitions
};

var adresseDefinitions = _.clone(definitions);
adresseDefinitions.Adgangsadresse = adgangsAdresseSchema;

var adresseSchema = {
  'title': 'Adresse',
  'type': 'object',
  'properties': {
    'href': {
      description: 'Adressens unikke URL.',
      $ref: '#/definitions/Href'
    },
    'id':      {
      description: 'Universel, unik identifikation af adressen af datatypen UUID . ' +
        'Er stabil over hele adressens levetid (ligesom et CPR-nummer) ' +
        'dvs. uanset om adressen evt. ændrer vejnavn, husnummer, postnummer eller kommunekode. ' +
        'Repræsenteret som 32 hexadecimale tegn. Eksempel: ”0a3f507a-93e7-32b8-e044-0003ba298018”.',
      '$ref': '#/definitions/UUID'
    },
    'etage':   {
      description: 'Etagebetegnelse. Hvis værdi angivet kan den antage følgende værdier: ' +
        'tal fra 1 til 99, st, kl, kl2 op til kl9.',
      '$ref': '#/definitions/Etage'
    },
    'dør':     {
      description: 'Dørbetnelse. Hvis værdi angivet kan den antage følgende værdier: ' +
        'tal fra 1 til 9999, små og store bokstaver samt tegnene / og -.',
      type: 'string'
    },
    'adressebetegnelse': {
      description: '',
      type: 'string'
    },
    'adgangsadresse': {
      description: 'Adressens adgangsadresse',
      $ref: '#/definitions/Adgangsadresse'
    }
  },
  'required': ['href','id', 'adressebetegnelse', 'adgangsadresse'],
  docOrder: ['href','id', 'etage', 'dør', 'adressebetegnelse', 'adgangsadresse'],
  'additionalProperties': false,
  'definitions': adresseDefinitions
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
  'title': 'vejstykke',
  'type': 'object',
  'properties': {
    'href': {
      description: 'Vejstykkets unikke URL.',
      $ref: '#/definitions/Href'
    },
    'kode': {
      description: 'Identifikation af vejstykke. ' +
        'Er unikt indenfor den pågældende kommune. Repræsenteret ved fire cifre. ' +
        'Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.',
      '$ref': '#/definitions/Kode4'
    },
    'navn' : {
      description: 'Vejens navn som det er fastsat og registreret af kommunen. Repræsenteret ved indtil 40 tegn. Eksempel: ”Hvidkildevej”.',
      type: 'string',
      maxLength: 40
    },
    'kommune': {
      description: 'Kommunen som vejstykket er beliggende i.',
      $ref: '#/definitions/KommuneRef'
    },
    'postnumre': {
      description: 'Postnummrene som vejstykket er beliggende i.',
      type: 'array',
      items: {
        $ref: '#/definitions/PostnummerRef'
      }
    }
  },
  'required': ['href', 'kode', 'navn','kommune', 'postnumre'],
  'additionalProperties': false,
  'definitions': definitions,
  docOrder: ['href', 'kode', 'navn', 'kommune', 'postnumre']
  };

var vejnavnSchema = {
  'title': 'vejnavnnavn',
  'type': 'object',
  'properties': {
    href: {
      description: 'Vejnavnets unikke URL.',
      $ref: '#/definitions/Href'
    },
    'navn': {
      description: 'Vejnavnet',
      type: 'string'
    }
  },
  required: ['href', 'navn'],
  additionalProperties: false,
  'definitions': definitions,
  docOrder: ['href', 'navn']
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
    'navn' : { type: 'string'}
  },
  'required': ['kode', 'navn'],
  'additionalProperties': false
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
