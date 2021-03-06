"use strict";

"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const registry = require('../registry');

const fieldsExcludedFromFlat = ['geom_json', 'visueltcenter'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);
const {globalSchemaObject} = require('../commonSchemaDefinitionsUtil');
const { schemaObject } = require('../schemaUtil');

const {makeHref, makeHrefFromPath, mapVisueltCenter, mapBbox, mapKommuneRef} = require('../commonMappers');
const { adressebetegnelse } = require('../util');
const normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

const normalizedFieldSchema = function (fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('bygning', fieldName);
};


exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const fieldsExcludedFromJson = ['geom_json', 'visueltcenter'];


exports.json = {
  schema: globalSchemaObject({
    title: 'bygning',
    properties: {
      href: {
        description: 'Bygningens unikke URL',
        $ref: '#/definitions/Href'
      },
      id: normalizedFieldSchema('id'),
      bygningstype: normalizedFieldSchema('bygningstype'),
      målested: normalizedFieldSchema('målested'),
      metode3d: normalizedFieldSchema('metode3d'),
      bbrbygning: schemaObject({
        nullable: true,
        properties: {
          href: {
            description: 'BBR bygningens URL.',
            $ref: '#/definitions/Href'
          },
          id: {
            description: 'Bygningens ID i BBR',
            $ref: '#/definitions/UUID'
          }
        },
        docOrder: ['href', 'id']
      }),
      synlig: normalizedFieldSchema('synlig'),
      overlap: normalizedFieldSchema('overlap'),
      adgangsadresser: {
        type: 'array',
        items: schemaObject({
          properties: {
            id: {
              description: 'Adgangsadressens unikke ID (UUID).',
              type: 'string',
              $ref: '#/definitions/UUID'
            },
            href: {
              description: 'Adgangsadressens unikke URL.',
              type: 'string',
              $ref: '#/definitions/Href'
            },
            adressebetegnelse: {
              description: 'Adressebetegnelsen for adgangsadressen',
              type: 'string'
            }
          },
          docOrder: ['id', 'href', 'adressebetegnelse']
        })
      },
      kommuner: {
        type: 'array',
        description: 'De kommuner, som bygningen ligger i. De bygninger ligger kun i én kommune, men bygninger kan overlappe kommunegrænser.',
        items: {
          $ref: '#/definitions/KommuneRef'
        }
      },
      visueltcenter: {
        description: 'Koordinater for bygningens visuelle center. Kan eksempelvis benyttes til en label for bygningen på et kort.',
        $ref: '#/definitions/NullableVisueltCenter'
      },
      bbox: {
        description: `Geometriens bounding box, dvs. det mindste rektangel som indeholder geometrien. Består af et array af 4 tal.
        De første to tal er koordinaterne for bounding boxens sydvestlige hjørne, og to sidste tal er
        koordinaterne for bounding boxens nordøstlige hjørne. Anvend srid parameteren til at angive det ønskede koordinatsystem.`,
        $ref: '#/definitions/NullableBbox'
      },
      'ændret': {
        description: 'Tidspunkt for seneste ændring registreret i DAWA. Opdateres ikke hvis ændringen kun vedrører' +
        ' geometrien (se felterne geo_ændret og geo_version).',
        $ref: '#/definitions/DateTimeUtc'
      }
    },
    docOrder: ['href', 'id', 'bygningstype', 'målested', 'metode3d','adgangsadresser', 'kommuner', 'bbrbygning', 'synlig', 'overlap', 'ændret', 'bbox', 'visueltcenter']
  }),
  fields: _.filter(_.where(fields, {selectable: true}), function (field) {
    return !_.contains(fieldsExcludedFromJson, field.name);
  }),
  mapper: (baseUrl) => row => {
    const result = {};
    result.href = makeHref(baseUrl, 'bygning', [row.id]);
    result.id = row.id;
    result.bygningstype = row.bygningstype;
    result.metode3d = row.metode3d;
    result.målested = row.målested;
    result.synlig = row.synlig;
    result.overlap = row.overlap;
    result.bbrbygning = row.bbrbygning_id ? {
      id: row.bbrbygning_id,
      href: makeHrefFromPath(baseUrl, 'bbrlight/bygninger', [row.bbrbygning_id])
    } : null;
    result.ændret = row.ændret;
    result.bbox = mapBbox(row);
    result.visueltcenter = mapVisueltCenter(row);
    result.adgangsadresser = (row.adgangsadresser || []).map(adg => ({
      id: adg.id,
      href: makeHref(baseUrl, 'adgangsadresse', [adg.id]),
      adressebetegnelse: adressebetegnelse(adg)
    }));
    result.kommuner = (row.kommuner || []).map(k => mapKommuneRef(k, baseUrl));
    result.adgangsadresser.sort((a, b) => a.id < b.id ? -1 : 1);
    result.kommuner.sort((a, b)=> parseInt(b.kode) - parseInt(a.kode));
    return result;
  }
};

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
representationUtil.addGeojsonRepresentations(exports, geojsonField);

registry.addMultiple('bygning', 'representation', module.exports);
