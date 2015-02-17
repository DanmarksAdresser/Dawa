"use strict";

var dagiTemaer = require('./temaer/temaer');
var schemaUtil = require('./schemaUtil');
var _ = require('underscore');

var schemaObject = schemaUtil.schemaObject;
var nullableType = schemaUtil.nullableType;
var nullable = schemaUtil.nullable;

var definitions = {
  'UUID' : {type: 'string', pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
  'Href' : {
    type: 'string'
  },
  'Kode4': {type: 'string', pattern: '^[\\d]{4}$'},
  'UpTo7': {type: 'integer', minimum: 1, maximum: 9999999},
  'DateTime': {
    type: 'string',
    pattern: '^[\\d]{4}-[\\d]{2}-[\\d]{2}T[\\d]{2}:[\\d]{2}:[\\d]{2}\\.[\\d]{3}$'
  },
  'DateTimeUtc': {
    type: 'string',
    pattern: '^[\\d]{4}-[\\d]{2}-[\\d]{2}T[\\d]{2}:[\\d]{2}:[\\d]{2}\\.[\\d]{3}Z$'
  },
  'husnr'  : {
    description: 'Husnummer der identificerer den pågældende adresse i forhold til andre adresser med samme vejnavn.' +
      ' Husnummeret består af et tal 1-999 evt. suppleret af et stort bogstav A..Z, og fastsættes i stigende orden, ' +
      'normalt med lige og ulige numre på hver side af vejen. Eksempel: "11", "12A", "187B".',
    type: 'string',
    pattern: '([1-9]|[1-9]\\d|[1-9]\\d{2})[A-Z]?'
  },
  'supplerendebynavn': {
    description: 'Et supplerende bynavn – typisk landsbyens navn – eller andet lokalt stednavn der er fastsat af ' +
      'kommunen for at præcisere adressens beliggenhed indenfor postnummeret. ' +
      'Indgår som en del af den officielle adressebetegnelse. Indtil 34 tegn. Eksempel: ”Sønderholm”.',
    type: 'string', maxLength: 34
  },
  'matrikelnr': {
    type: 'string',
    pattern: '^[0-9a-zæøå]{1,7}$'
  },
  esrejendomsnr: {
    type: 'string',
    pattern: '^[1-9][0-9]{0,6}'
  },
  sfeejendomsnr: {
    type: 'string',
    pattern: '^[1-9][0-9]{0,6}'
  },
  'Etage':   {
    description: 'Etagebetegnelse. Hvis værdi angivet kan den antage følgende værdier: ' +
      'tal fra 1 til 99, st, kl, kl2 op til kl9.',
    type: 'string',
    pattern: '^([1-9]|[1-9][0-9]|st|kl[1-9]?)$'
  },
  'Dør':     {
    description: 'Dørbetegnelse. Hvis værdi angivet kan den antage følgende værdier: ' +
      'tal fra 1 til 9999, små og store bogstaver samt tegnene / og -.',
    type: 'string'
  },
  'Status': {
    type: 'integer'
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

function dagiSchema(dagiTema) {
  return  {
    'title': dagiTema.singular,
    'properties': {
      'href': {
        description: dagiTema.singularSpecific + 's unikke URL.',
        $ref: '#/definitions/Href'
      },
      'kode': {
        description: 'Fircifret ' + dagiTema.singular + 'kode.',
        $ref: '#/definitions/Kode4'
      },
      'navn': {
        description: dagiTema + dagiTema.singularSpecific + 's navn.',
        type: 'string'
      }
    },
    'docOrder': ['href', 'kode', 'navn']
  };
}

dagiTemaer.forEach(function(dagiTema) {
  definitions[dagiTema.singular + 'Ref'] = schemaObject(dagiSchema(dagiTema));
});

_.each(definitions, function(value, key) {
  definitions['Nullable' + key] = nullable(value);
});


module.exports = definitions;