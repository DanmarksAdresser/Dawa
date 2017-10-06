"use strict";

"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const registry = require('../registry');

const fieldsExcludedFromFlat = ['geom_json'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);
const {globalSchemaObject} = require('../commonSchemaDefinitionsUtil');
const {nullableType} = require('../schemaUtil');
var schema = require('../parameterSchema');

exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const fieldsExcludedFromJson = ['geom_json'];

exports.json = {
  schema: globalSchemaObject({
    title: 'Stednavn',
    properties: {
      id: {
        type: 'string',
        schema: schema.uuid,
        description: 'Stednavnets unikke ID'
      },
      hovedtype: {
        type: 'string',
        description: 'Stednavnets hovedtype, eksempelvis Bebyggelse'
      },
      undertype: {
        type: 'string',
        description: 'Stednavnets undertype, eksempelvis bydel'
      },
      navn: {
        type: nullableType('string'),
        description: 'Stednavnets navn'
      },
      navnestatus: {
        type: nullableType('string'),
        description: 'Stednavnets navnestatus'
      },
      egenskaber: {
        description: 'Yderligere egenskaber for stednavnet, som er specifikke for den pågældende hovedtype'
      },
      'ændret': {
        description: 'Tidspunkt for seneste ændring registreret i DAWA. Opdateres ikke hvis ændringen kun vedrører' +
        ' geometrien (se felterne geo_ændret og geo_version).',
        $ref: '#/definitions/DateTimeUtc'
      },
      'geo_ændret': {
        description: 'Tidspunkt for seneste ændring af geometrien registreret i DAWA.',
        $ref: '#/definitions/DateTimeUtc'
      },
      geo_version: {
        description: 'Versionsangivelse for geometrien. Inkrementeres hver gang geometrien ændrer sig i DAWA.',
        type: 'integer'
      }

    },
    docOrder: ['id', 'hovedtype', 'undertype', 'navn', 'navnestatus', 'egenskaber', 'ændret', 'geo_ændret', 'geo_version']
  }),
  fields: _.filter(_.where(fields, {selectable: true}), function (field) {
    return !_.contains(fieldsExcludedFromJson, field.name);
  }),
  mapper: (baseUrl) => row => row
};

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

registry.addMultiple('stednavn', 'representation', module.exports);
