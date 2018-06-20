"use strict";

const schemaUtil = require('./schemaUtil');
const _ = require('underscore');

const schemaObject = schemaUtil.schemaObject;
const nullableType = schemaUtil.nullableType;
const nullable = schemaUtil.nullable;

const definitions = {
  VisueltCenter: {
    type: 'array',
    items: {
      type: 'number'
    }
  },
  Bbox: {
    type: 'array',
    minItems: 4,
    maxItems: 4,
    items: {
      type: 'number'
    }
  },
  'UUID' : {
    postgresql: 'UUID',
    type: 'string',
    pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'
  },
  'Href' : {
    postgresql: 'TEXT',
    type: 'string'
  },
  'Kode4': {
    postgresql: 'SMALLINT',
    type: 'string',
    pattern: '^[\\d]{4}$'
  },
  'UpTo7': {
    postgresql: 'INTEGER',
    type: 'integer',
    minimum: 1,
    maximum: 9999999
  },
  'DateTime': {
    postgresql: 'TIMESTAMP',
    type: 'string',
    pattern: '^[\\d]{4}-[\\d]{2}-[\\d]{2}T[\\d]{2}:[\\d]{2}:[\\d]{2}\\.[\\d]{3}$'
  },
  'DateTimeUtc': {
    postgresql: 'TIMESTAMP WITH TIMEZONE',
    type: 'string',
    pattern: '^[\\d]{4}-[\\d]{2}-[\\d]{2}T[\\d]{2}:[\\d]{2}:[\\d]{2}\\.[\\d]{3}Z$'
  },
  'Integer': {
    postgresql: 'INTEGER',
    type: 'integer'
  },
  'Boolean': {
    postgresql: 'BOOLEAN',
    type: 'boolean'
  },
  'Number': {
    postgresql: 'DOUBLE PRECISION',
    type: 'number'
  },
  'Vejnavn': {
    postgresql: 'VARCHAR(40)',
    type: 'string',
    maxLength: 40
  },
  'VejnavnForkortet': {
    postgresql: 'VARCHAR(20)',
    type: 'string',
    maxLength: 20
  },
  'PostnrNavn': {
    postgresql: 'VARCHAR(20)',
    type: 'string',
    maxLength: 20
  },
  'Nøjagtighed': {
    postgresql: 'ENUM(\'A\', \'B\', \'U\')',
    type: 'string',
    pattern: '^A|B|U$'
  },
  'Tekniskstandard': {
    postgresql: 'ENUM(\'TD\', \'TK\', \'TN\', \'UF\')',
    type: 'string',
    pattern: '^TD|TK|TN|UF$'
  },
  'Tekstretning': {
    postgresql: 'DOUBLE PRECISION',
    type: 'number',
    minimum: 0,
    maximum: 400
  },
  'EjerlavNavn': {
    postgresql: 'VARCHAR(255)',
    type: 'string'
  },
  'ValglandsdelBogstav': {
    postgresql: 'VARCHAR(1)',
    type: 'string'
  },
  'Zone': {
    postgresql: 'ENUM(\'Byzone\', \'Sommerhusområde\', \'Landzone\')',
    type: 'string'
  },
  'esdhreference': {
    postgresql: 'TEXT',
    description: 'Nøgle i ESDH-system.',
    type: 'string'
  },
  'journalnummer': {
    postgresql: 'TEXT',
    description: 'Journalnummer.',
    type: 'string'
  },
  'husnr'  : {
    postgresql: 'VARCHAR(6)',
    description: 'Husnummer der identificerer den pågældende adresse i forhold til andre adresser med samme vejnavn.' +
      ' Husnummeret består af et tal 1-999 evt. suppleret af et stort bogstav A..Z, og fastsættes i stigende orden, ' +
      'normalt med lige og ulige numre på hver side af vejen. Eksempel: "11", "12A", "187B".',
    type: 'string',
    pattern: '([1-9]|[1-9]\\d|[1-9]\\d{2})[A-Z]?'
  },
  'supplerendebynavn': {
    postgresql: 'VARCHAR(34)',
    description: 'Et supplerende bynavn – typisk landsbyens navn – eller andet lokalt stednavn der er fastsat af ' +
      'kommunen for at præcisere adressens beliggenhed indenfor postnummeret. ' +
      'Indgår som en del af den officielle adressebetegnelse. Indtil 34 tegn. Eksempel: ”Sønderholm”.',
    type: 'string', maxLength: 34
  },
  'matrikelnr': {
    postgresql: 'VARCHAR(7)',
    type: 'string',
    pattern: '^[0-9a-zæøå]{1,7}$'
  },
  esrejendomsnr: {
    postgresql: 'INTEGER',
    type: 'string',
    pattern: '^[1-9][0-9]{0,6}'
  },
  sfeejendomsnr: {
    postgresql: 'INTEGER',
    type: 'string',
    pattern: '^[1-9][0-9]{0,6}'
  },
  'Etage':   {
    postgresql: 'VARCHAR(3)',
    description: 'Etagebetegnelse. Hvis værdi angivet kan den antage følgende værdier: ' +
      'tal fra 1 til 99, st, kl, kl2 op til kl9.',
    type: 'string',
    pattern: '^([1-9]|[1-9][0-9]|st|kl[1-9]?)$'
  },
  'Dør':     {
    postgresql: 'VARCHAR(4)',
    description: 'Dørbetegnelse. Hvis værdi angivet kan den antage følgende værdier: ' +
      'tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.',
    type: 'string'
  },
  'Status': {
    postgresql: 'INTEGER',
    type: 'integer'
  },
  'DARStatus': {
    enum: ["intern forberedelse", "foreløbig", "gældende", "nedlagt", "henlagt", "slettet", "ikke i brug", "i brug", "udgået"]
  },
  GeoJsonCoordinates: {
    type: 'array',
    items: {
      description: 'koordinat for punktet.',
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
    postgresql: 'INTEGER',
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
  KommuneRefNoName: schemaObject({
    properties: {
      href: {
        description: 'Kommunens unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Kommunekoden. 4 cifre.',
        '$ref': '#/definitions/Kode4'
      }
    },
    docOrder: ['href', 'kode']
  }),
  RegionsRef: schemaObject({
    properties: {
      href: {
        description: 'Regionens unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Regionskoden. 4 cifre.',
        '$ref': '#/definitions/Kode4'
      },
      navn: {
        description: 'Regionens navn.',
        type: nullableType('string')
      }
    },
    docOrder: ['href', 'kode', 'navn']
  }),
  RegionsRefNoName: schemaObject({
    properties: {
      href: {
        description: 'Regionens unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Regionskoden. 4 cifre.',
        '$ref': '#/definitions/Kode4'
      }
    },
    docOrder: ['href', 'kode']
  }),
  SogneRef: schemaObject({
    properties: {
      href: {
        description: 'Sognets unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Sognekoden. 4 cifre.',
        '$ref': '#/definitions/Kode4'
      },
      navn: {
        description: 'Sognets navn.',
        type: nullableType('string')
      }
    },
    docOrder: ['href', 'kode', 'navn']
  }),
  SogneRefNoName: schemaObject({
    properties: {
      href: {
        description: 'Sognets unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Sognekoden. 4 cifre.',
        '$ref': '#/definitions/Kode4'
      }
    },
    docOrder: ['href', 'kode']
  }),
  RetskredsRef: schemaObject({
    properties: {
      href: {
        description: 'Retskredsens unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Retskredskoden. 4 cifre.',
        '$ref': '#/definitions/Kode4'
      },
      navn: {
        description: 'Retskredsens navn.',
        type: nullableType('string')
      }
    },
    docOrder: ['href', 'kode', 'navn']
  }),
  RetskredsRefNoName: schemaObject({
    properties: {
      href: {
        description: 'Retskredsens unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Retskredskoden. 4 cifre.',
        '$ref': '#/definitions/Kode4'
      }
    },
    docOrder: ['href', 'kode']
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
  EjerlavRef: schemaObject({
    properties: {
      href: {
        description: 'Ejerlavets unikke URL.',
        type: 'string'
      },
      kode: {
        description: 'Ejerlavets kode. Op til 7 cifre.',
        $ref: '#/definitions/UpTo7'
      },
      navn: {
        description: 'Ejerlavets navn.',
        type: 'string'
      }
    },
    docOrder: ['href', 'kode','navn']
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
  OpstillingskredsRef: schemaObject({
    properties: {
      href: {
        description: 'Opstillingskredsens URL',
        type: 'string'
      },
      nummer: {
        description: 'Opstillingskredsens unikke nummer',
        type: 'string'
      },
      navn: {
        description: 'Opstillingskredsens unikke navn',
        type: 'string'
      }
    },
    docOrder: ['href', 'nummer', 'navn']
  }),
  StorkredsRef: schemaObject({
    properties: {
      href: {
        description: 'Storkredsens URL',
        type: 'string'
      },
      nummer: {
        description: 'Storkredsens unikke nummer',
        type: 'string'
      },
      navn: {
        description: 'Storkredsens unikke navn',
        type: 'string'
      }
    },
    docOrder: ['href', 'nummer', 'navn']
  }),
  ValglandsdelsRef: schemaObject({
    properties: {
      href: {
        description: 'Valglandsdelens URL.',
        type: 'string'
      },
      bogstav: {
        description: 'Valglandsdelens bogstav.',
        type: 'string'
      },
      navn: {
        description: 'Valglandsdelens navn',
        type: 'string'
      }
    },
    docOrder: ['href', 'bogstav', 'navn']
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
      },
      adresseringsnavn: {
        description: 'En evt. forkortet udgave af vejnavnet på højst 20 tegn, som bruges ved adressering på labels og rudekuverter og lign., hvor der ikke plads til det fulde vejnavn.',
        type: nullableType('string')
      }

    },
    docOrder: ['href', 'kode', 'navn', 'adresseringsnavn']
  })
};

definitions.bebyggelse = schemaObject(
  {
    properties: {
      id: {
        description: 'Bebyggelsens unikke ID',
        type: 'string'
      },
      href: {
        description: 'Bebyggelsens unikke URL',
        type: 'string'
      },
      kode: {
        description: 'Bebyggelsens kode. Anvendes bl.a. af Danmarks Statistik',
        type: ['null', 'integer']
      },
      type: {
        description: 'Bebyggelsens type. Kan antage værdierne "by", "bydel", "spredtBebyggelse", "sommerhusområde", "sommerhusområdedel", "industriområde", "kolonihave", "storby"',
        type: 'string'
      },
      navn: {
        description: 'Bebyggelsens navn. Bebyggelsers navne er ikke unikke.',
        type: 'string'
      }
    },
    docOrder: ['id', 'href', 'kode', 'type', 'navn']
  }
);

_.each(definitions, function(value, key) {
  definitions['Nullable' + key] = nullable(value);
});


module.exports = definitions;
