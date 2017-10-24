"use strict";

const _ = require('underscore');
const parameters = require('./parameters');
const nameAndKey = require('./nameAndKey');
const representations = require('./representations');
const sqlModel = require('./sqlModel');
const resourcesUtil = require('../common/resourcesUtil');
const registry = require('../registry');

module.exports = [
  // query
  resourcesUtil.queryResourceSpec(nameAndKey, {
    }, representations,
    sqlModel),
  resourcesUtil.getByKeyResourceSpec(
    nameAndKey, parameters.id,
    {
    },
    representations,
    sqlModel)
];

const qualifiers = ['query', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function (pair) {
  registry.add('stednavntype', 'resource', pair[0], pair[1]);
});
