"use strict";

const _ = require('underscore');
const nameAndKey = require('./nameAndKey');
const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const  { makeHref} = require('../commonMappers');
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

exports.mini = representationUtil.miniRepresentation(
    miniFieldNames,
    fields,
    miniSchema,
    (baseUrl, row) => makeHref(baseUrl, nameAndKey.singular, [row.postnr, row.vejnavn]),
    row => `${row.vejnavn}, ${kode4String(row.postnr)} ${row.postnrnavn}`
);

exports.autocomplete = representationUtil.autocompleteRepresentation(exports.mini, nameAndKey.singular);

exports.json = exports.mini;

const geomJsonField = _.findWhere(fields, {name: 'geom_json'});
representationUtil.addGeojsonRepresentations(exports, geomJsonField);


const registry = require('../registry');
registry.addMultiple('vejnavnpostnummerrelation', 'representation', module.exports);
