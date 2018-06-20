"use strict";

const _ = require('underscore');

const commonMappers = require('../commonMappers');
const commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
const flats = require('./flats');
const fieldsMap = require('./fields');
const registry = require('../registry');
const representationUtil = require('../common/representationUtil');

const globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;

const makeHref = commonMappers.makeHref;

const commonSchemaProperties = flat => ({
  href: {
    description: `Unik URL for ${flat.singularSpecific}.`,
    type: 'string'
  },
  ændret: {
    description: 'Tidspunkt for seneste ændring registreret i DAWA. Opdateres ikke hvis ændringen kun vedrører geometrien (se felterne geo_ændret og geo_version).',
    type: 'string'
  },
  geo_version: {
    description: 'Versionsangivelse for geometrien. Inkrementeres hver gang geometrien ændrer sig i DAWA.',
    type: 'integer'
  },
  geo_ændret: {
    description: 'Tidspunkt for seneste ændring af geometrien registreret i DAWA.',
    type: 'string'
  },
  bbox: {
    description: 'Bounding box for geometrien',
    $ref: '#/definitions/Bbox'
  },
  visueltcenter: {
    description: 'Koordinater for geometriens visuelle center. Kan eksempelvis benyttes til placering af label på et kort.',
    $ref: '#/definitions/VisueltCenter'
  },
});

const jsonSchema = (flat, fields) => {
  const schema = fields.reduce((memo, field) =>
    {
      const schema = field.schema ? Object.assign({}, field.schema) : {
        type: field.type
      };
      schema.description = field.description;

      memo.properties[field.name] = schema;

      memo.docOrder.push(field.name);
      return memo;
    },
    {
      properties: Object.assign({}, commonSchemaProperties(flat)),
      docOrder: Object.keys(commonSchemaProperties(flat))
    }
  );
  return globalSchemaObject(schema);
};

var jordstykkeJsonSchema = function () {
  var schema = jsonSchema(flats.jordstykke, flats.jordstykke.fields.filter(field =>
    _.contains(['matrikelnr', 'esrejendomsnr', 'udvidet_esrejendomsnr','sfeejendomsnr'], field.name)));
  schema.properties.ejerlav = {
    description: 'Ejerlavet som jordstykket tilhører.',
    $ref: '#/definitions/EjerlavRef'
  };
  schema.properties.kommune = {
    description: 'Kommunen som jordstykket er beliggende i.',
    $ref: '#/definitions/NullableKommuneRefNoName'
  };
  schema.properties.region = {
    description: 'Regionen som jordstykket er beliggende i.',
    $ref: '#/definitions/NullableRegionsRefNoName'
  };
  schema.properties.sogn = {
    description: 'Sognet som jordstykket er beliggende i.',
    $ref: '#/definitions/NullableSogneRefNoName'
  };
  schema.properties.retskreds = {
    description: 'Retskredsen, som er tilknyttet jordstykket, angiver hvilken ret den matrikulære registreringsmeddelse er sendt til. Efter 2008 sendes alle registreringsmeddelser til tinglysningsretten i Hobro, som i Matriklen har retskredskode 1180. I denne forbindelse anvender Matriklen et andet retskredsbegreb end DAGI, hvor retskredskoden 1180 ikke eksisterer.',
    $ref: '#/definitions/NullableRetskredsRefNoName'
  };
  schema.docOrder = schema.docOrder.concat(['ejerlav', 'kommune', 'region', 'sogn', 'retskreds']);
  return globalSchemaObject(schema);
};

const fieldsExcludedFromFlat = ['geom_json'];
const fieldsExcludedFromJson = ['geom_json'];
const customRepresentations = {
  jordstykke: {
    json: {
      fields: representationUtil.fieldsWithoutNames(fieldsMap.jordstykke, fieldsExcludedFromJson),
      schema: jordstykkeJsonSchema(),
      mapper: function (baseUrl) {
        return function (value) {
          var result = {};
          result.ændret = value.ændret;
          result.geo_version = value.geo_version;
          result.geo_ændret = value.geo_ændret;
          result.matrikelnr = value.matrikelnr;
          result.bbox = commonMappers.mapBbox(value);
          result.visueltcenter = commonMappers.mapVisueltCenter(value);
          result.href = makeHref(baseUrl, 'jordstykke', [value.ejerlavkode, value.matrikelnr]);
          result.ejerlav = commonMappers.mapEjerlavRef(value.ejerlavkode, value.ejerlavnavn, baseUrl);
          result.kommune = commonMappers.mapKode4NavnTemaNoName('kommune', value.kommunekode, baseUrl);
          result.region = commonMappers.mapKode4NavnTemaNoName('region', value.regionskode, baseUrl);
          result.sogn = commonMappers.mapKode4NavnTemaNoName('sogn', value.sognekode, baseUrl);
          result.retskreds = commonMappers.mapKode4NavnTemaNoName('retskreds', value.retskredskode, baseUrl);
          result.esrejendomsnr = value.esrejendomsnr ? ('' + value.esrejendomsnr) : null;
          result.udvidet_esrejendomsnr = value.udvidet_esrejendomsnr ? ('' + value.udvidet_esrejendomsnr) : null;
          result.sfeejendomsnr = value.sfeejendomsnr ? ('' + value.sfeejendomsnr) : null;
          return result;
        };
      }
    }
  }
};


module.exports = _.mapObject(flats, (flat) => {
  const fields = fieldsMap[flat.singular];
  const flatFields = representationUtil.fieldsWithoutNames(fieldsMap.jordstykke, fieldsExcludedFromFlat);
  const flatRepresentation = representationUtil.defaultFlatRepresentation(flatFields);
  const schema = jsonSchema(flat, flat.fields);
  const defaultJsonRep = {
    fields: flatFields,
    schema: schema,
    mapper: (baseUrl, params) => (row => {
      row.href = makeHref(baseUrl, flat.singular, flat.key.map(keyField => row[keyField]));
      return row;
    })
  };

  const representations = {
    flat: flatRepresentation,
    json: customRepresentations[flat.singular] && customRepresentations[flat.singular].json ?
      customRepresentations[flat.singular].json :
      defaultJsonRep
  };
  const geojsonField = _.findWhere(fields, {name: 'geom_json'});
  representations.geojson = representationUtil.geojsonRepresentation(geojsonField, representations.flat);
  representations.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, representations.json);
  return representations;
});

Object.keys(module.exports).forEach(flatName => {
  registry.addMultiple(flatName, 'representation', module.exports[flatName]);
});

