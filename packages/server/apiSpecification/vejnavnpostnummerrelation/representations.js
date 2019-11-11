"use strict";

const _ = require('underscore');
const nameAndKey = require('./nameAndKey');
const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const  { makeHref, mapPostnummerRef, mapKommuneRefArray, mapBbox, mapVisueltCenter} = require('../commonMappers');
const commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
const {kode4String} = require('../util');

const globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
const fieldsExcludedFromFlat = ['geom_json'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);
exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const miniSchema = globalSchemaObject({
    properties: {
        betegnelse: {
            description: 'Betegnelsen på relationen på formen "{vejnavn}, {postnr} {postnrnavn}',
            type: 'string'
        },
        'href': {
            description: 'Relationens unikke URL.',
            $ref: '#/definitions/Href'
        },
        'vejnavn': {
            description: 'Vejnavnet.',
            type: 'string'
        },
        'postnr': {
            description: 'Postnummeret.',
            $ref: '#/definitions/Postnr'
        },
        postnrnavn: {
            description: 'Navnet på postnummeret, f.eks. "Aarhus C"',
            type: 'string'
        }
    },
    docOrder: ['betegnelse', 'href', 'vejnavn', 'postnr', 'postnrnavn']
});

const miniFieldNames = ['vejnavn', 'postnr', 'postnrnavn'];

const hrefFormatter = (baseUrl, row) => makeHref(baseUrl, nameAndKey.singular, [row.postnr, row.vejnavn]);
const betegnelseFormatter = row => `${row.vejnavn}, ${kode4String(row.postnr)} ${row.postnrnavn}`;
exports.mini = representationUtil.miniRepresentation(
    miniFieldNames,
    fields,
    miniSchema,
    hrefFormatter,
    betegnelseFormatter

);

exports.autocomplete = representationUtil.autocompleteRepresentation(exports.mini, nameAndKey.singular);

exports.json = {
    fields: _.where(fields, { selectable: true }),
    schema: globalSchemaObject({
        'title': 'vejnavnpostnummerrelation',
        'properties': {
            betegnelse: {
                description: 'Betegnelse for relationen på formen "{vejnavn}, {postnr} {postnrnavn}"'
            },
            href: {
                description: 'Relationens unikke URL.',
                $ref: '#/definitions/Href'
            },
            'vejnavn': {
                description: 'Vejnavnet.',
                type: 'string'
            },
            'postnummer': {
                description: 'Postnummeret.',
                $ref: '#/definitions/PostnummerRef'
            },
            'kommuner': {
                description: 'De kommuner hvori der ligger en vej med dette navn og postnummer',
                type: 'array',
                items: { '$ref': '#/definitions/KommuneRef'}
            },
            visueltcenter: {
                description: 'Koordinater for geometriens visuelle center. Kan eksempelvis benyttes til at placere label på et kort.',
                $ref: '#/definitions/NullableVisueltCenter'
            },
            bbox: {
                description: `Geometriens bounding box, dvs. det mindste rektangel som indeholder geometrien. Består af et array af 4 tal.
        De første to tal er koordinaterne for bounding boxens sydvestlige hjørne, og to sidste tal er
        koordinaterne for bounding boxens nordøstlige hjørne. Anvend srid parameteren til at angive det ønskede koordinatsystem.`,
                $ref: '#/definitions/NullableBbox'
            },

        },
        docOrder: ['betegnelse', 'href', 'vejnavn', 'postnummer', 'visueltcenter', 'bbox', 'kommuner']
    }),
    mapper: function (baseUrl) {
        return function(row) {
            return {
                betegnelse: betegnelseFormatter(row),
                href: hrefFormatter(baseUrl, row),
                vejnavn: row.vejnavn,
                postnummer: mapPostnummerRef({nr: row.postnr, navn: row.postnrnavn}, baseUrl),
                bbox: mapBbox(row),
                visueltcenter: mapVisueltCenter(row),
                kommuner: mapKommuneRefArray(row.kommuner, baseUrl)
            }
        };
    }
};
const geomJsonField = _.findWhere(fields, {name: 'geom_json'});
representationUtil.addGeojsonRepresentations(exports, geomJsonField);


const registry = require('../registry');
registry.addMultiple('vejnavnpostnummerrelation', 'representation', module.exports);
