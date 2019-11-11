"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

const { kode4String} = require('../util');

var fields = [
    {
        name: 'vejnavn'
    },
    {
        name: 'postnr',
        formatter: kode4String
    },
    {
        name: 'postnrnavn'
    },
    {
        name: 'geom_json',
        selectable: true
    },
    {
        name: 'kommuner',
        multi: true
    },
    {
        name: 'bbox_xmin'
    },
    {
        name: 'bbox_ymin'
    },
    {
        name: 'bbox_xmax'
    },
    {
        name: 'bbox_ymax'
    },
    {
        name: 'visueltcenter_x'
    },
    {
        name: 'visueltcenter_y'
    }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports = fields;
