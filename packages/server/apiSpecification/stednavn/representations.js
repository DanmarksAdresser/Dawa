"use strict";

"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const registry = require('../registry');

const fieldsExcludedFromFlat = ['sted_geom_json', 'visueltcenter'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);
const {globalSchemaObject} = require('../commonSchemaDefinitionsUtil');
const {makeHref } = require('../commonMappers');

const normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

const normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('stednavn', fieldName);
};

const normalizedStedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('sted', fieldName);
};

const stedRepresentations = require('../sted/representations');

const stedJsonRepresentation = stedRepresentations.json;

exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const fieldsExcludedFromJson = ['sted_geom_json', 'visueltcenter'];

const miniSchema = globalSchemaObject({
  properties: {
    tekst: {
      type: 'string',
      description: 'Stednavnets navn'
    },
    href: {
      type: 'string',
      description: 'Stednavnets unikke URL'
    },
    navn: normalizedFieldSchema('navn'),
    navnestatus: normalizedFieldSchema('navnestatus'),
    brugsprioritet: normalizedFieldSchema('brugsprioritet'),
    sted_id: normalizedStedFieldSchema('id'),
    sted_hovedtype: normalizedStedFieldSchema('hovedtype'),
    sted_undertype: normalizedStedFieldSchema('undertype')
  },
  docOrder: ['tekst', 'href', 'navn', 'navnestatus', 'brugsprioritet',
    'sted_id', 'sted_hovedtype', 'sted_undertype']
});

exports.mini = representationUtil.miniRepresentation(
  ['sted_id', 'navn', 'navnestatus', 'brugsprioritet', 'sted_hovedtype', 'sted_undertype', 'sted_kommuner'],
  fields,
  miniSchema,
  (baseUrl, row) => makeHref(baseUrl, 'stednavn', [row.sted_id, row.navn]),
  row => {
    let text = row.navn;
    if(row.sted_kommuner && row.sted_kommuner.length === 1) {
      text += `, ${row.sted_kommuner[0].navn} kommune`;
    }
    return text;
  }
);

exports.json = {
  schema: globalSchemaObject({
    title: 'Stednavn',
    properties: {
      href: {
        type: 'string',
        description: 'Stednavnets unikke URL'
      },
      navn: normalizedFieldSchema('navn'),
      navnestatus: normalizedFieldSchema('navnestatus'),
      brugsprioritet: normalizedFieldSchema('brugsprioritet'),
      sted: Object.assign({}, stedRepresentations.json.schema, {description: 'Stedet, som stednavnet tilhører'})
    },
    docOrder: ['href', 'navn', 'navnestatus', 'brugsprioritet', 'sted']
  }),
  fields: _.filter(_.where(fields, {selectable: true}), function (field) {
    return !_.contains(fieldsExcludedFromJson, field.name);
  }),
  mapper: (baseUrl) => row => {
    const result = ['navn', 'navnestatus', 'brugsprioritet'].reduce(
      (memo, prop) => {
        memo[prop] = row[prop];
        return memo;
      }, {});
    result.href = makeHref(baseUrl, 'stednavn', [row.sted_id, row.navn]);
    const stedRow = Object.entries(row).reduce((memo, [name, val]) => {
      if(name.indexOf('sted_') === 0) {
        memo[name.substring('sted_'.length)] = val;
      }
      return memo;
    }, {});
    result.sted = stedJsonRepresentation.mapper(baseUrl)(stedRow);
    return result;
  }
};

const geojsonField = _.findWhere(fields, {name: 'sted_geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

registry.addMultiple('stednavn', 'representation', module.exports);
