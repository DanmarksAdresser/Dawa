"use strict";

var _ = require('underscore');

var definitions = require('../commonSchemaDefinitions');
var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');
var adgangsadresseRepresentations = require('../adgangsadresse/representations');
var adressebetegnelse = util.adressebetegnelse;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var maybeNull = util.maybeNull;
var d = util.d;
var schemaObject = schemaUtil.schemaObject;



var nullableType = schemaUtil.nullableType;

exports.flat = representationUtil.adresseFlatRepresentation(fields);

var adresseDefinitions = _.clone(definitions);
adresseDefinitions.Adgangsadresse = adgangsadresseRepresentations.json.schema;

exports.json = {
  fields: _.where(fields, {selectable: true}),
  schema: globalSchemaObject({
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
      'historik' : schemaObject({
        'description': 'Væsentlige tidspunkter for adressen',
        properties: {
          'oprettet': {
            description: 'Dato og tid for adressens oprettelse. Eksempel: 2001-12-23T00:00:00.',
            '$ref': '#/definitions/NullableDateTime'
          },
          'ændret': {
            description: 'Dato og tid hvor der sidst er ændret i adressen. Eksempel: 2002-04-08T00:00:00.',
            type: nullableType('string'),
            '$ref': '#/definitions/NullableDateTime'
          }
        },
        docOrder: ['oprettet', 'ændret']

      }),
      'adgangsadresse': {
        description: 'Adressens adgangsadresse',
        $ref: '#/definitions/Adgangsadresse'
      }
    },
    docOrder: ['href','id', 'etage', 'dør', 'adressebetegnelse', 'historik', 'adgangsadresse'],
    definitions: adresseDefinitions
  }),
  mapper: function(baseUrl, params, singleResult) {
    var adgangsadresseMapper = adgangsadresseRepresentations.json.mapper(baseUrl, params,singleResult);
    return function(rs) {
      var adr = {};
      adr.id = rs.id;
      adr.href = makeHref(baseUrl, 'adresse', [rs.id]);
      adr.historik = {
        oprettet: d(rs.oprettet),
        ændret: d(rs.ændret)
      };
      adr.etage = maybeNull(rs.etage);
      adr.dør = maybeNull(rs.dør);
      adr.adressebetegnelse = adressebetegnelse(rs);
      var adgangsadresseUnmapped = _.clone(rs);
      _.extend(adgangsadresseUnmapped,{
        id: rs.adgangsadresseid,
        oprettet: rs.adgangsadresse_oprettet,
        ændret: rs.adgangsadresse_ændret,
      });
      adr.adgangsadresse = adgangsadresseMapper(adgangsadresseUnmapped);
      return adr;
    };
  }
};

var autocompleteFieldNames = ['id', 'vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn', 'etage', 'dør'];

exports.autocomplete = {
  fields: representationUtil.fieldsWithNames(fields, autocompleteFieldNames),
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
  mapper: function(baseUrl) {
    return function (row) {
      function adresseText(row) {
        return adressebetegnelse(row);
      }
      return {
        tekst: adresseText(row),
        adresse: {
          id: row.id,
          href: makeHref(baseUrl, 'adresse', [row.id])
        }
      };
    };
  }
};

exports.geojson = representationUtil.geojsonRepresentation(_.findWhere(fields, {name: 'geom_json'}), exports.flat);

var registry = require('../registry');
registry.addMultiple('adresse', 'representation', module.exports);