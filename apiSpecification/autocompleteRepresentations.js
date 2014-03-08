"use strict";

var commonMappers = require('./commonMappers');
var commonSchemaDefinitionsUtil = require('./commonSchemaDefinitionsUtil');
var dagiTemaer = require('./dagiTemaer');
var schemaUtil = require('./schemaUtil');
var util = require('./util');
var _ = require('underscore');

var adressebetegnelse = util.adressebetegnelse;
var dagiTemaJsonMapper = commonMappers.dagiTemaJsonMapper;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var kode4String = util.kode4String;
var makeHref = commonMappers.makeHref;
var mapPostnummerRef = commonMappers.mapPostnummerRef;


exports.adgangsadresse = {
  schema: globalSchemaObject({
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
  mapper: function (row, options) {
    function adresseText(row) {
      return adressebetegnelse(row, true).replace(/\n/g, ', ');
    }

    return {
      tekst: adresseText(row),
      adgangsadresse: {
        id: row.a_id,
        href: makeHref(options.baseUrl, 'adgangsadresse', [row.a_id])
      }
    };
  }
};

exports.adresse = {
  schema: globalSchemaObject({
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
  }),
  mapper: function (row, options) {
    function adresseText(row) {
      return adressebetegnelse(row).replace(/\n/g, ', ');
    }
    return {
      tekst: adresseText(row),
      adresse: {
        id: row.id,
        href: makeHref(options.baseUrl, 'adresse', [row.id])
      }
    };
  }
};

exports.supplerendebynavn = {
  schema: globalSchemaObject({
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
  mapper: function(row, options) {
    return {
      tekst: row.supplerendebynavn,
      supplerendebynavn: {
        href:  makeHref(options.baseUrl, 'supplerendebynavn', [row.supplerendebynavn]),
        navn: row.supplerendebynavn
      }
    };
  }
};

exports.vejnavn = {
  schema: globalSchemaObject({
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
  mapper: function (row, options) {
    return {
      tekst: row.navn,
      vejnavn: {
        href: makeHref(options.baseUrl, 'vejnavn', [row.navn]),
        navn: row.navn
      }
    };
  }
};

exports.vejstykke = {
  schema: globalSchemaObject( {
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
  mapper: function (row, options) {
    return {
      tekst: row.vejnavn,
      vejstykke: {
        href: makeHref(options.baseUrl, 'vejstykke', [row.kommunekode, row.kode]),
        kommunekode: kode4String(row.kommunekode),
        kode: kode4String(row.kode),
        navn: row.vejnavn
      }
    };
  }
};

exports.postnummer = {
  schema: globalSchemaObject( {
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
  mapper: function (row, options) {
    return {
      tekst: row.nr + ' ' + row.navn,
      postnummer: mapPostnummerRef(row, options.baseUrl)
    };
  }
};

dagiTemaer.forEach(function(tema) {
  function dagiAutocompleteSchema(dagiTema) {
    var properties = {
      tekst: {
        description: 'Koden efterfulgt af navnet på ' + dagiTema.singularSpecific,
        type: 'string'
      }
    };
    properties[dagiTema.singular] = {
      description: dagiTema.singularSpecific,
      $ref: '#/definitions/' + dagiTema.singular + 'Ref'
    };
    return globalSchemaObject({
      properties: properties,
      docOrder: ['tekst', dagiTema.singular]
    });
  }

  function dagiTemaAutocompleteMapper(singular, path) {
    return function(row, options) {
      var result = {
        tekst: '' + row.kode + ' ' + row.navn
      };
      result[singular] = dagiTemaJsonMapper(path)(row, options);
      return result;
    };
  }

  exports[tema.singular] = {
    schema: dagiAutocompleteSchema(tema),
    mapper: dagiTemaAutocompleteMapper(tema.singular, tema.plural)
  };

});
_.each(exports, function(rep) {
  rep.schema = schemaUtil.compileSchema(rep.schema);
});

