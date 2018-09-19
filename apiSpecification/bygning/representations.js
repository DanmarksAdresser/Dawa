"use strict";

"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const registry = require('../registry');

const fieldsExcludedFromFlat = ['geom_json', 'visueltcenter'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);
const {globalSchemaObject} = require('../commonSchemaDefinitionsUtil');
const commonMappers = require('../commonMappers');
const { stringToNumber } = require('../util');
// const normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

// var normalizedFieldSchema = function (fieldName) {
//   return normalizedFieldSchemas.normalizedSchemaField('bygning', fieldName);
// };


exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const fieldsExcludedFromJson = ['geom_json', 'visueltcenter'];


exports.json = {
  schema: globalSchemaObject({
    title: 'bygning',
    properties: {
      id: {
        description: 'Bygningens unikke ID. Heltal.',
        type: 'integer'
      },
      visueltcenter: {
        description: 'Koordinater for bygningens visuelle center. Kan eksempelvis benyttes til en label for bygningen på et kort.',
        $ref: '#/definitions/NullableVisueltCenter'
      },
      bbox: {
        description: `Geometriens bounding box, dvs. det mindste rektangel som indeholder geometrien. Består af et array af 4 tal.
        De første to tal er koordinaterne for bounding boxens sydvestlige hjørne, og to to sidste tal er
        koordinaterne for bounding boxens nordøstlige hjørne. Anvend srid parameteren til at angive det ønskede koordinatsystem.`,
        $ref: '#/definitions/NullableBbox'
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
    docOrder: ['id', 'ændret', 'geo_ændret', 'geo_version', 'bbox', 'visueltcenter']
  }),
  fields: _.filter(_.where(fields, {selectable: true}), function (field) {
    return !_.contains(fieldsExcludedFromJson, field.name);
  }),
  mapper: (baseUrl) => row => {
    const result = {};
    result.id = stringToNumber(row.id);
    result.ændret = row.ændret;
    result.geo_version = row.geo_version;
    result.geo_ændret = row.geo_ændret;
    result.bbox = commonMappers.mapBbox(row);
    result.visueltcenter = commonMappers.mapVisueltCenter(row);
    return result;
  }
};

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

registry.addMultiple('bygning', 'representation', module.exports);
