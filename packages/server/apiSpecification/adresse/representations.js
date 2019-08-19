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

function adresseText(row) {
  var fields = _.clone(row);
  fields.husnr = husnrUtil.formatHusnr(row.husnr);
  return adressebetegnelse(fields);
}

var kvhxFieldsDts = require('./kvhxTransformer').kvhxFieldsDts;
var kvhxFormat = require('./kvhxTransformer').format;
var kvhFormat = require('../adgangsadresse/kvhTransformer').format;


const miniFieldNames = [...adgangsadresseRepresentations.mini.outputFields, 'adgangsadresseid', 'etage', 'dør'];

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
  'darstatus', 'storkredsnummer', 'storkredsnavn', 'valglandsdelsbogstav', 'valglandsdelsnavn',
  'landsdelsnuts3', 'landsdelsnavn'];

exports.flat.outputFields = _.difference(exports.flat.outputFields, FIELDS_AT_END).concat(FIELDS_AT_END);



var adresseDefinitions = _.clone(definitions);
adresseDefinitions.Adgangsadresse = adgangsadresseRepresentations.json.schema;


const miniSchema = {
  properties: JSON.parse(JSON.stringify(adgangsadresseRepresentations.mini.schema.properties)),
  docOrder: JSON.parse(JSON.stringify(adgangsadresseRepresentations.mini.schema.docOrder)),
} ;

Object.assign(miniSchema.properties, {
  adgangsadresseid: {
    description: 'Adgangsadressens ID.',
    $ref: '#/definitions/UUID'
  },
  'etage':   {
    '$ref': '#/definitions/NullableEtage'
  },
  'dør':     {
    '$ref': '#/definitions/NullableDør'
  }
});

miniSchema.docOrder = [...miniSchema.docOrder, 'adgangsadresseid', 'etage', 'dør'];

exports.mini = representationUtil.miniRepresentation(
  miniFieldNames,
  fields,
  globalSchemaObject(miniSchema),
  (baseUrl, row) => makeHref(baseUrl, 'adresse', [row.id]),
  adresseText);

exports.autocomplete = representationUtil.autocompleteRepresentation(exports.mini, 'adresse');

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

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
representationUtil.addGeojsonRepresentations(exports, geojsonField);

var registry = require('../registry');
registry.addMultiple('adresse', 'representation', module.exports);
