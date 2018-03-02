"use strict";
const registry = require('../../registry');
const normalizeParameters = require('../../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([
    {
      name: 'txid',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'txid',
      type: 'integer',
    },
  ]),
  txidInterval: normalizeParameters([
    {
      name: 'txidfra',
      type: 'integer'
    }, {
      name: 'txidtil',
      type: 'integer'
    }
  ])
};
registry.addMultiple('transaktion', 'parameterGroup', module.exports);
