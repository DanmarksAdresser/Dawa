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
const { makeHref } = require('../commonMappers');

var schema = require('../parameterSchema');

exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const fieldsExcludedFromJson = ['geom_json'];

exports.json = {
  schema: globalSchemaObject({
    title: 'Bebyggelse',
    properties: {
      id: {
        type: 'string',
        schema: schema.uuid,
        description: 'Unik identifikator for bebyggelsen.'
      },
      href: {
        type: 'string',
        description: 'Unik URL for bebyggelsen'
      },
      kode: {
        type: ['integer', 'null'],
        description: 'Unik kode for bebyggelsen.'
      },
      type: {
        type: 'string',
        description: 'Angiver typen af bebyggelse. Mulige værdier: "by", "bydel", "spredtBebyggelse", "sommerhusområde", "sommerhusområdedel", "industriområde", "kolonihave", "storby'
      },
      navn: {
        type: nullableType('string'),
        description: 'Bebyggelsens navn.'
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
    docOrder: ['id', 'href', 'kode', 'type', 'navn', 'ændret', 'geo_ændret', 'geo_version']
  }),
  fields: _.filter(_.where(fields, {selectable: true}), function (field) {
    return !_.contains(fieldsExcludedFromJson, field.name);
  }),
  mapper: (baseUrl) => row => {
    row.href = makeHref(baseUrl, 'bebyggelse', [row.id]);
    return row;
  }
};

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

registry.addMultiple('bebyggelse', 'representation', module.exports);
