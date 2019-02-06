"use strict";

var _ = require('underscore');

var definitions = require('../commonSchemaDefinitions');
var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var husnrUtil = require('../husnrUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');
var adgangsadresseRepresentations = require('../adgangsadresse/representations');
var adressebetegnelse = util.adressebetegnelse;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var maybeNull = util.maybeNull;
var d = util.d;
var schemaObject = schemaUtil.schemaObject;

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
var normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('adresse', fieldName);
};

var kvhxFieldsDts = require('./kvhxTransformer').kvhxFieldsDts;
var kvhxFormat = require('./kvhxTransformer').format;
var kvhFormat = require('../adgangsadresse/kvhTransformer').format;

var nullableType = schemaUtil.nullableType;
var kode4String = util.kode4String;

const adgangsadresseMiniFieldNamesWithoutCoords = _.without(adgangsadresseRepresentations.mini.outputFields, 'x', 'y');
const miniFieldNamesWithoutCoords = adgangsadresseMiniFieldNamesWithoutCoords.concat(['adgangsadresseid', 'etage', 'dør']);
const miniFieldNames = miniFieldNamesWithoutCoords.concat(['x', 'y']);

const miniFieldsWithoutCoords = fields.filter(field => _.contains(miniFieldNamesWithoutCoords, field.name));
const miniFields = fields.filter(field => _.contains(miniFieldNames, field.name));

exports.mini = representationUtil.defaultFlatRepresentation(miniFields);

exports.flat = representationUtil.adresseFlatRepresentation(fields, function(rs) {
  return {
    kvhx: kvhxFormat(rs),
    kvh: kvhFormat(rs)
  };
});

// this should probably be refactored, so we explicitly control the order of fields, but for now we
// just move kvh to the end.

const FIELDS_AT_END = ['kvh', 'højde', 'adgangspunktid', 'vejpunkt_id', 'vejpunkt_kilde',
  'vejpunkt_nøjagtighed', 'vejpunkt_tekniskstandard', 'vejpunkt_x', 'vejpunkt_y', 'afstemningsområdenummer',
  'afstemningsområdenavn', 'brofast', 'supplerendebynavn_dagi_id',
  'navngivenvej_id', 'menighedsrådsafstemningsområdenummer', 'menighedsrådsafstemningsområdenavn', 'vejpunkt_ændret',
  'ikrafttrædelse', 'nedlagt', 'adgangsadresse_ikrafttrædelse', 'adgangsadresse_nedlagt', 'adgangsadresse_darstatus',
  'darstatus', 'storkredsnummer', 'storkredsnavn', 'valglandsdelsbogstav', 'valglandsdelsnavn'];

exports.flat.outputFields = _.difference(exports.flat.outputFields, FIELDS_AT_END).concat(FIELDS_AT_END);



var adresseDefinitions = _.clone(definitions);
adresseDefinitions.Adgangsadresse = adgangsadresseRepresentations.json.schema;

exports.json = {
  fields: _.where(fields, {selectable: true}),
  schema: globalSchemaObject({
    title: 'Adresse',
    properties: {
      href: {
        description: 'Adressens unikke URL.',
        $ref: '#/definitions/Href'
      },
      id: normalizedFieldSchema('id'),
      kvhx: {
        description: 'Sammensat nøgle for adressen. Indeholder til brug for integration til ældre systemer felter, der tilsammen identificerer adressen. Hvis det er muligt, bør adressens id eller href benyttes til identifikation.<br />' +
        'KVHX-nøglen er sammen således:' +
        '<dl>' +
        kvhxFieldsDts +
        '</dl>' +
        'En adresse på vejstykke 1074 (Melvej) 6, st. tv i kommune 420 (Assens) vil altså få KVH-nøgle "04201074___6_st__tv"',
        type: 'string'
      },
      status: normalizedFieldSchema('status'),
      darstatus: {
        description: 'Aadressens status angivet ved statuskode i DAR. 2=Føreløbig, 3=Gældende, 4=Nedlagt, 5=Henlagt',
        type: 'integer'
      },
      etage: normalizedFieldSchema('etage'),
      dør: normalizedFieldSchema('dør'),
      adressebetegnelse: {
        description: '',
        type: 'string'
      },
      historik : schemaObject({
        description: 'Væsentlige tidspunkter for adressen',
        properties: {
          oprettet: normalizedFieldSchema('oprettet'),
          ændret: normalizedFieldSchema('ændret'),
          ikrafttrædelse: {
            description: 'Tidspunkt for adressens ikrafttrædelse, dvs. det tidspunkt hvor adressen har status "gældende". Kan være i fremtiden.'
          },
          nedlagt: {
            description: 'Tidspunkt for adressens nedlæggelse eller henlæggelse, dvs. det tidspunkt' +
            ' hvor adressen har status "nedlagt" eller "henlagt". Kan være i fremtiden.'
          },
        },
        docOrder: ['oprettet', 'ændret', 'ikrafttrædelse', 'nedlagt']
      }),
      adgangsadresse: {
        description: 'Adressens adgangsadresse',
        $ref: '#/definitions/Adgangsadresse'
      }
    },
    docOrder: ['href','id', 'kvhx', 'status', 'darstatus', 'etage', 'dør', 'adressebetegnelse', 'historik', 'adgangsadresse'],
    definitions: adresseDefinitions
  }),
  mapper: function(baseUrl, params, singleResult) {
    var adgangsadresseMapper = adgangsadresseRepresentations.json.mapper(baseUrl, params,singleResult);
    return function(rs) {
      var adr = {};
      adr.id = rs.id;
      adr.kvhx = kvhxFormat(rs);
      adr.status = rs.status;
      adr.darstatus = rs.darstatus;
      adr.href = makeHref(baseUrl, 'adresse', [rs.id]);
      adr.historik = {
        oprettet: d(rs.oprettet),
        ændret: d(rs.ændret),
        ikrafttrædelse: d(rs.ikrafttrædelse),
        nedlagt: d(rs.nedlagt)
      };
      adr.etage = maybeNull(rs.etage);
      adr.dør = maybeNull(rs.dør);
      var fields = _.clone(rs);
      fields.husnr = husnrUtil.formatHusnr(rs.husnr);
      adr.adressebetegnelse = adressebetegnelse(fields);
      var adgangsadresseUnmapped = _.clone(rs);
      _.extend(adgangsadresseUnmapped,{
        id: rs.adgangsadresseid,
        status: rs.adgangsadresse_status,
        darstatus: rs.adgangsadresse_darstatus,
        oprettet: rs.adgangsadresse_oprettet,
        ændret: rs.adgangsadresse_ændret,
        ikrafttrædelse: rs.adgangsadresse_ikrafttrædelse,
        nedlagt: rs.adgangsadresse_nedlagt
      });
      adr.adgangsadresse = adgangsadresseMapper(adgangsadresseUnmapped);
      return adr;
    };
  }
};

var autocompleteFieldNames = ['id', 'vejnavn', 'husnr', 'supplerendebynavn', 'postnr', 'postnrnavn', 'etage', 'dør', 'stormodtagerpostnr', 'stormodtagerpostnrnavn', 'adgangsadresseid'];

exports.autocomplete = {
  fields: representationUtil.fieldsWithNames(fields, autocompleteFieldNames),
  schema: globalSchemaObject({
    properties: {
      tekst: {
        description: 'Adressen på formen {vej} {husnr}, {etage}. {dør}, {supplerende bynavn}, {postnr} {postnrnavn}',
        type: 'string'
      },
      adresse: {
        description: 'Udvalge informationer om adressen.',
        properties: {
          href: {
            description: 'Adressens unikke URL.',
            type: 'string'
          },
          id: {
            description: 'Adressens unikke UUID.',
            $ref: '#/definitions/UUID'
          },
          vejnavn: {
            description: 'Vejnavnet',
            type: nullableType('string')
          },
          'etage':   {
            '$ref': '#/definitions/NullableEtage'
          },
          'dør':     {
            '$ref': '#/definitions/NullableDør'
          },
          husnr: {
            description: 'Husnummer',
            $ref: '#/definitions/husnr'
          },
          supplerendebynavn: {
            $ref: '#/definitions/Nullablesupplerendebynavn'
          },
          postnr: {
            description: 'Postnummer',
            type: nullableType('string')
          },
          postnrnavn: {
            description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn. ' +
              'Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.',
            type: nullableType('string')
          },
          stormodtagerpostnr: {
            description: 'Evt. stormodtagerpostnummer, som er tilknyttet adgangsadressen.',
            type: nullableType('string')
          },
          stormodtagerpostnrnavn: {
            description: 'Stormodtagerpostnummerets navn.',
            type: nullableType('string')
          }
        },
        docOrder: ['id', 'href', 'vejnavn', 'etage', 'dør','husnr', 'supplerendebynavn', 'postnr', 'postnrnavn', 'stormodtagerpostnr', 'stormodtagerpostnrnavn']

      }
    },
    docOrder: ['tekst', 'adresse']
  }),
  mapper: function(baseUrl) {
    return function (row) {
      function adresseText(row) {
        var fields = _.clone(row);
        fields.husnr = husnrUtil.formatHusnr(row.husnr);
        return adressebetegnelse(fields);
      }
      return {
        tekst: adresseText(row),
        adresse: {
          id: row.id,
          href: makeHref(baseUrl, 'adresse', [row.id]),
          vejnavn: maybeNull(row.vejnavn),
          husnr: husnrUtil.formatHusnr(row.husnr),
          etage: maybeNull(row.etage),
          dør: maybeNull(row.dør),
          supplerendebynavn: maybeNull(row.supplerendebynavn),
          postnr: kode4String(row.postnr),
          postnrnavn: maybeNull(row.postnrnavn),
          stormodtagerpostnr: kode4String(row.stormodtagerpostnr),
          stormodtagerpostnrnavn: row.stormodtagerpostnrnavn
        }
      };
    };
  }
};

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

const miniWithoutCordsRep = representationUtil.defaultFlatRepresentation(miniFieldsWithoutCoords);
exports.geojsonMini=representationUtil.geojsonRepresentation(geojsonField, miniWithoutCordsRep);

var registry = require('../registry');
registry.addMultiple('adresse', 'representation', module.exports);
