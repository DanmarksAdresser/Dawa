"use strict";

"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const registry = require('../registry');

const fieldsExcludedFromFlat = ['sted_geom_json', 'visueltcenter'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);
const {globalSchemaObject} = require('../commonSchemaDefinitionsUtil');
const {nullableType} = require('../schemaUtil');
const {makeHref } = require('../commonMappers');

const stedRepresentations = require('../sted/representations');

const stedJsonRepresentation = stedRepresentations.json;

exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const fieldsExcludedFromJson = ['sted_geom_json', 'visueltcenter'];

exports.json = {
  schema: globalSchemaObject({
    title: 'Stednavn',
    properties: {
      href: {
        type: 'string',
        description: 'Stednavnets unikke URL'
      },
      navn: {
        type: nullableType('string'),
        description: 'Stednavnets navn'
      },
      navnestatus: {
        enum: ['officielt', 'uofficielt', 'suAutoriseret'],
        description: 'Stednavnets navnestatus. Mulige værdier: "officielt", "uofficielt", "suAutoriseret"',
      },
      brugsprioritet: {
        enum: ['primær', 'sekundær'],
        description: 'Angiver stednavnets brugsprioritet. Et sted har et primært stednavn og 0 eller flere sekundære stednavne. Mulige værdier: primær, sekundær'
      },
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
