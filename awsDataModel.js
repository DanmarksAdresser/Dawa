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

/**
 * Creates a JSON schema object with all fields as required,
 * and the specified docOrder, allowing no additional properties.
 */
function schemaObject(def){
  var fieldNames = _.keys(def.properties).sort();
  var documentedNames = _.clone(def.docOrder).sort();
  if(!_.isEqual(fieldNames, documentedNames)) {
    throw new Error("docOrder and list of fields did not correspond. fieldNames: " + JSON.stringify(fieldNames) + " documentedNames " + JSON.stringify(documentedNames));
  }
  var result = {
    type : def.nullable ? nullableType('object') : 'object',
    properties: def.properties,
    required: fieldNames,
    additionalProperties: false,
    docOrder: def.docOrder
  }
  if(def.title) {
    result.title = def.title;
  }
  if(def.description) {
    result.description = def.description;
  }
  return result;
}

function globalSchemaObject(def) {
  var result = schemaObject(def);
  if(def.definitions) {
    result.definitions = def.definitions;
  }
  else {
    result.definitions = definitions;
  }
  return result;
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
  'Kode4': {type: 'string', pattern: '^[\\d]{4}$'},
  'UpTo7': {type: 'integer', minimum: 1, maximum: 9999999},
  'DateTime': {
    type: 'string'
  },
  GeoJsonCoordinates: {
    type: 'array',
    items: {
      description: 'koordinateterne for punktet.',
      type: 'number'
    },
    "minItems": 2,
    "maxItems": 2
  },
  GeoJsonPunkt: schemaObject({
    properties: {
      'type': {
        description: 'Har altid værdien \'Point\'.',
        enum: ['Point']
      },
      coordinates: {
        description: 'koordinateterne for punktet.',
        $ref: '#/definitions/GeoJsonCoordinates'
      }
    },
    docOrder: ['type', 'coordinates']
  }),
  Postnr: {
    type: 'string',
    pattern: "^[\\d]{4}$"
  },
  PostnummerRef: schemaObject({
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
        description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn. ' +
          'Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.',
        type: nullableType('string')
      }
    },
    docOrder: ['href', 'nr', 'navn']
  }),
  KommuneRef: schemaObject({
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
    docOrder: ['href', 'kode', 'navn']
  }),
  VejnavnRef: schemaObject({
    properties: {
      href: {
        description: 'Vejnavnets unikke URL.',
        type: 'string'
      },
      navn: {
        description: 'Vejnavnet.',
        type: 'string'
      }
    },
    docOrder: ['href', 'navn']
  }),
  VejstykkeRef: schemaObject({
    properties: {
      href: {
        description: 'Vejnavnets unikke URL.',
        type: 'string'
      },
      kommunekode: {
        description: 'Kommunekoden. 4 cifre.',
        $ref: '#/definitions/Kode4'
      },
      kode: {
        description: 'Vejkoden. 4 cifre.',
        $ref: '#/definitions/Kode4'
      },
      navn: {
        description: 'Vejnavnet.',
        type: 'string'
      }
    },
    docOrder: ['href', 'kommunekode', 'kode','navn']
  }),
  SupplerendeBynavnRef: schemaObject({
    properties: {
      href: {
        description: 'Det supplerende bynavns unikke URL.',
        type: 'string'
      },
      navn: {
        description: 'Det supplerende bynavn.',
        type: 'string'
      }
    },
    docOrder: ['href', 'navn']
  }),
  AdgangsadresseRef: schemaObject({
    properties: {
      href: {
        description: 'Adgangsadressens unikke URL.',
        type: 'string'
      },
      id: {
        description: 'Adgangsadressens unikke UUID.',
        $ref: '#/definitions/UUID'
      }
    },
    docOrder: ['href', 'id']
  }),
  AdresseRef: schemaObject({
    properties: {
      href: {
        description: 'Adressens unikke URL.',
        type: 'string'
      },
      id: {
        description: 'Adressens unikke UUID.',
        $ref: '#/definitions/UUID'
      }
    },
    docOrder: ['href', 'id']
  }),
  VejstykkeKodeOgNavn: schemaObject({
    properties: {
      href: {
        description: 'Vejstykkets unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Identifikation af vejstykket. ' +
          'Er unikt indenfor den pågældende kommune. Repræsenteret ved fire cifre. ' +
          'Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.',
        '$ref': '#/definitions/Kode4'
      },
      navn: {
        description: 'Vejens navn.',
        type: nullableType('string')
      }
    },
    docOrder: ['href', 'kode', 'navn']
  })
};

var autocompleteSchemas = {
  postnummer: globalSchemaObject( {
    properties: {
      tekst: {
        description: 'Postnummeret (4 cifre) efterfulgt af postnummerområdets navn, f.eks. "8260 Viby J".',
        type: 'string'
      },
      postnummer: {
        description: 'Link og basale data for postnummret.',
        $ref: '#/definitions/PostnummerRef'
      }
    },
    docOrder: ['tekst', 'postnummer']
  }),
  vejnavn: globalSchemaObject({
    properties: {
      tekst: {
        description: 'Vejnavnet',
        type: 'string'
      },
      vejnavn: {
        description: 'Link og basale data for vejnavnet',
        $ref: '#/definitions/VejnavnRef'
      }
    },
    docOrder: ['tekst', 'vejnavn']
  }),
  vejstykke: globalSchemaObject( {
    properties: {
      tekst: {
        description: 'Navnet på vejstykket',
        type: 'string'
      },
      vejstykke: {
        description: 'Link og basale data for vejstykket',
        $ref: '#/definitions/VejstykkeRef'
      }
    },
    docOrder: ['tekst', 'vejstykke']
  }),
  kommune: globalSchemaObject({
    properties: {
      tekst: {
        description: 'Kommunens navn',
        type: 'string'
      },
      kommune: {
        description: 'Link og basale data for kommunen.',
        $ref: '#/definitions/KommuneRef'
      }
    },
    docOrder: ['tekst', 'kommune']
  }),
  supplerendeBynavn: globalSchemaObject({
    properties: {
      tekst: {
        description: 'Det supplerende bynavn.',
        type: 'string'
      },
      supplerendebynavn: {
        description: 'Link og basale data for det supplerende bynavn.',
        $ref: '#/definitions/SupplerendeBynavnRef'
      }
    },
    docOrder: ['tekst', 'supplerendebynavn']
  }),
  adgangsadresse: globalSchemaObject({
      properties: {
        tekst: {
          description: 'Adgangsadressen på formen {vej} {husnr}, {supplerende bynavn}, {postnr} {postnrnavn}',
          type: 'string'
        },
        adgangsadresse: {
          description: 'Link og id for adgangsadressen.',
          $ref: '#/definitions/AdgangsadresseRef'
        }
      },
      docOrder: ['tekst', 'adgangsadresse']
    }),
  adresse: globalSchemaObject({
    properties: {
      tekst: {
        description: 'Adressen på formen {vej} {husnr}, {etage}. {dør}, {supplerende bynavn}, {postnr} {postnrnavn}',
        type: 'string'
      },
      adresse: {
        description: 'Link og id for adressen.',
        $ref: '#/definitions/AdresseRef'
      }
    },
    docOrder: ['tekst', 'adresse']
  })
};

_.map(autocompleteSchemas, function(schema) {
  return compileSchema(schema);
});

_.each(definitions, function(value, key) {
  definitions['Nullable' + key] = nullable(value);
});

var adgangsAdresseSchema = globalSchemaObject({
  title: 'Adgangsadresse',
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
      description: 'Husnummer der identificerer den pågældende adresse i forhold til andre adresser med samme vejnavn.' +
        ' Husnummeret består af et tal 1-999 evt. suppleret af et stort bogstav A..Z, og fastsættes i stigende orden, ' +
        'normalt med lige og ulige numre på hver side af vejen. Eksempel: "11", "12A", "187B".',
      type: 'string',
      pattern: '([1-9]|[1-9]\\d|[1-9]\\d{2})[A-Z]?'
    },
    'bygningsnavn': {
      description: 'Evt. bygningsnavn eller gårdnavn, der er registreret af kommunen som en supplerende adressebetegnelse. Indtil 34 tegn. Eksempel: ”Solholm”. Udgår og bliver overført til Stednavne.',
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
      $ref: '#/definitions/NullablePostnummerRef'
    },
    'kommune':{
      description: 'Kommunen som adressen er beliggende i.',
      $ref: '#/definitions/KommuneRef'
    },
    'ejerlav': schemaObject({
      description: 'Det matrikulære ejerlav som adressen ligger i.',
      nullable: true,
      properties: {
        'kode': {
          description: 'Unik identifikation af det matrikulære ”ejerlav”, som adressen ligger i. ' +
            'Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.',
          '$ref': '#/definitions/UpTo7'
        },
        'navn': {
          description: 'Det matrikulære ”ejerlav”s navn. Eksempel: ”Eskebjerg By, Bregninge”.',
          type: 'string'
        }
      },
      docOrder: ['kode', 'navn']
    }),
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
      type: nullableType('string'),
      pattern: '^[0-9]{1,6}'
    },
    'historik' : schemaObject({
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
        }
      },
      docOrder: ['oprettet', 'ikrafttrædelse', 'ændret']

    }),
    'adgangspunkt': schemaObject({
      description: 'Geografisk punkt, som angiver særskilt adgang fra navngiven vej ind på et areal eller bygning.',
      properties: {
        koordinater: {
          description: 'Adgangspunktets koordinater som array [x,y].',
          $ref: '#/definitions/NullableGeoJsonCoordinates'
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
          type: nullableType('integer'), minimum: 1, maximum: 5

        },
        tekniskstandard: {
          description: 'Kode der angiver den specifikation adressepunktet skal opfylde. 2 tegn. ' +
            '”TD” = 3 meter inde i bygningen ved det sted hvor indgangsdør e.l. skønnes placeret; ' +
            '”TK” = Udtrykkelig TK-standard: 3 meter inde i bygning, midt for længste side mod vej; ' +
            '”TN” Alm. teknisk standard: bygningstyngdepunkt eller blot i bygning; ' +
            '”UF” = Uspecificeret/foreløbig: ikke nødvendigvis placeret i bygning."',
          type: nullableType('string'),
          pattern: '^TD|TK|TN|UF$'
        },
        tekstretning: {
          description: 'Angiver en evt. retningsvinkel for adressen i ”gon” ' +
            'dvs. hvor hele cirklen er 400 gon og 200 er vandret. ' +
            'Værdier 0.00-400.00: Eksempel: ”128.34”.',
          type: nullableType('number'),
          minimum: 0,
          maximum: 400
        },
        ændret: {
          description: 'Dato og tid for sidste ændring i adressepunktet. Eksempel: ”1998-11-17T00:00:00”',
          '$ref': '#/definitions/NullableDateTime'
        }
      },
      docOrder: ['koordinater','nøjagtighed','kilde', 'tekniskstandard','tekstretning', 'ændret']
    }),
    'DDKN': schemaObject({
      nullable: true,
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
    }),
    'sogn': schemaObject({
      nullable: true,
      description: 'Sognet som adressen er beliggende i.',
      properties: {
        kode: {
          description: 'Identifikation af sognet',
          $ref: '#/definitions/Kode4'
        },
        navn: {
          description: 'Sognets navn',
          type: 'string'
        }
      },
      docOrder: ['kode', 'navn']
    }),
    'region': schemaObject({
      nullable: true,
      description: 'Regionen som adressen er beliggende i.',
      properties: {
        kode: {
          description: 'Identifikation af regionen',
          $ref: '#/definitions/Kode4'
        },
        navn: {
          description: 'Regionens navn',
          type: 'string'
        }
      },
      docOrder: ['kode', 'navn']
    }),
    'retskreds': schemaObject({
      nullable: true,
      description: 'Retskredsen som adressen er beliggende i.',
      properties: {
        kode: {
          description: 'Identifikation af retskredsen',
          $ref: '#/definitions/Kode4'
        },
        navn: {
          description: 'Retskredsens navn',
          type: 'string'
        }
      },
      docOrder: ['kode', 'navn']
    }),
    'politikreds': schemaObject({
      nullable: true,
      description: 'Politikredsen som adressen er beliggende i.',
      properties: {
        kode: {
          description: 'Identifikation af politikredsen',
          $ref: '#/definitions/Kode4'
        },
        navn: {
          description: 'Politikredsens navn',
          type: 'string'
        }
      },
      docOrder: ['kode', 'navn']
    }),
    'opstillingskreds': schemaObject({
      nullable: true,
      description: 'Opstillingskresen som adressen er beliggende i.',
      properties: {
        kode: {
          description: 'Identifikation af opstillingskredsen.',
          $ref: '#/definitions/Kode4'
        },
        navn: {
          description: 'Opstillingskredsens navn.',
          type: 'string'
        }
      },
      docOrder: ['kode', 'navn']
    }),
    'afstemningsområde': schemaObject({
      nullable: true,
      description: 'Afstemningsområdet som adressen er beliggende i.',
      properties: {
        kode: {
          description: 'Identifikation af afstemningsområdet',
          $ref: '#/definitions/Kode4'
        },
        navn: {
          description: 'Afstemningsområdet navn',
          type: 'string'
        }
      },
      docOrder: ['kode', 'navn']
    })
  },
  docOrder: ['href','id', 'vejstykke', 'husnr','bygningsnavn', 'supplerendebynavn',
  'postnummer','kommune', 'ejerlav', 'matrikelnr','esrejendomsnr', 'historik',
  'adgangspunkt', 'DDKN', 'sogn','region','retskreds','politikreds','opstillingskreds','afstemningsområde']
});

var adresseDefinitions = _.clone(definitions);
adresseDefinitions.Adgangsadresse = adgangsAdresseSchema;

var adresseSchema = globalSchemaObject({
  'title': 'Adresse',
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
      '$ref': '#/definitions/NullableEtage'
    },
    'dør':     {
      description: 'Dørbetnelse. Hvis værdi angivet kan den antage følgende værdier: ' +
        'tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.',
      type: nullableType('string')
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
  docOrder: ['href','id', 'etage', 'dør', 'adressebetegnelse', 'adgangsadresse'],
  definitions: adresseDefinitions
});

var postnummerSchema =  globalSchemaObject({
  'title': 'postnummer',
  'properties': {
    'href': {
      description: 'Postnummerets unikke URL.',
      '$ref': '#/definitions/Href'
    },
    'nr'      : {
      description: 'Unik identifikation af det postnummer som postnummeret er beliggende i. Postnumre fastsættes af Post Danmark. Repræsenteret ved fire cifre. Eksempel: ”2400” for ”København NV”.',
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
      type: nullableType('string')
    },
    'kommuner': {
      description: 'De kommuner hvis areal overlapper postnumeret areal.',
      type: 'array',
      items: {
        '$ref': '#/definitions/KommuneRef'
      }
    }
  },
  'docOrder': ['href','nr', 'navn', 'version', 'stormodtageradresse', 'kommuner']
});

var vejstykkeSchema = globalSchemaObject({
  'title': 'vejstykke',
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
  docOrder: ['href', 'kode', 'navn', 'kommune', 'postnumre']
});

var vejnavnSchema = globalSchemaObject({
  'title': 'vejnavn',
  'properties': {
    href: {
      description: 'Vejnavnets unikke URL.',
      $ref: '#/definitions/Href'
    },
    'navn': {
      description: 'Vejnavnet',
      type: 'string'
    },
    'postnumre': {
      description: 'De postnumre, hvori der ligger en vej med dette navn.',
      type: 'array',
      items: {
        $ref: '#/definitions/PostnummerRef'
      }
    },
    'kommuner': {
      description: 'De kommuner hvori der ligger en vej med dette navn.',
      type: 'array',
      items: { '$ref': '#/definitions/KommuneRef'}
    }
  },
  docOrder: ['href', 'navn', 'postnumre', 'kommuner']
});

var supplerendebynavnSchema = globalSchemaObject({
  'title': 'supplerendebynavn',
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
  'docOrder': ['href', 'navn', 'kommuner', 'postnumre']
});

var kommuneSchema = globalSchemaObject({
  'title': 'kommune',
  'properties': {
    'href': {
      description: 'Kommunens unikke URL.',
      $ref: '#/definitions/Href'
    },
    'kode': {
      description: 'Fircifret kommunekode.',
      $ref: '#/definitions/Kode4'
    },
    'navn' : {
      description: 'Kommunens navn.',
      type: 'string'
    }
  },
  'docOrder': ['href', 'kode', 'navn']
});


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
    autocompleteSchema: autocompleteSchemas.adresse,
    key : 'id',
    validate: makeValidator(adresseSchema)
  },

  adgangsadresse : {
    name: 'adgangsadresse',
    plural : 'adgangsadresser',
    schema : compileSchema(adgangsAdresseSchema),
    autocompleteSchema: autocompleteSchemas.adgangsadresse,
    key : 'id',
    validate: makeValidator(adgangsAdresseSchema)
  },

  postnummer : {
    name: 'postnummer',
    plural: 'postnumre',
    schema: compileSchema(postnummerSchema),
    autocompleteSchema: autocompleteSchemas.postnummer,
    key: 'nr',
    validate: makeValidator(postnummerSchema)
  },

  vejstykke : {
    name: 'vejstykke',
    plural: 'vejstykker',
    table: 'vejstykkerView',
    schema: compileSchema(vejstykkeSchema),
    autocompleteSchema: autocompleteSchemas.vejstykke,
    key: ['kommunekode','kode'],
    validate: makeValidator(vejstykkeSchema)
  },

  vejnavn: {
    name: 'vejnavn',
    plural: 'vejnavne',
    schema: compileSchema(vejnavnSchema),
    autocompleteSchema: autocompleteSchemas.vejnavn,
    key: 'navn',
    validate: makeValidator(vejnavnSchema)
  },

  supplerendebynavn : {
    name: 'supplerendebynavn',
    plural: 'supplerendebynavne',
    schema: compileSchema(supplerendebynavnSchema),
    autocompleteSchema: autocompleteSchemas.supplerendeBynavn,
    key: 'navn',
    validate: makeValidator(supplerendebynavnSchema)
  },

  kommune : {
    name: 'kommune',
    plural: 'kommuner',
    table: 'kommuner',
    schema: compileSchema(kommuneSchema),
    autocompleteSchema: autocompleteSchemas.kommune,
    key: 'kode',
    validate: makeValidator(kommuneSchema)
  }

};

/******************************************************************************/
/*** EOF **********************************************************************/
/******************************************************************************/
