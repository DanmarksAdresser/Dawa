"use strict";

const normalizeParameters = require('../../common/parametersUtil').normalizeParameters;
const { keyParameters } = require('../commonParameters');

exports.keyParameters = keyParameters;
// sequence number filtering is supported for all events
exports.sekvensnummer = normalizeParameters([
  {
    name: 'sekvensnummerfra',
    type: 'integer'
  },
  {
    name: 'sekvensnummertil',
    type: 'integer'
  }
]);

// timestamp filtering is supported for all events
exports.tidspunkt = normalizeParameters([
  {
    name: 'tidspunktfra',
    type: 'string'
  }, {
    name: 'tidspunkttil',
    type: 'string'
  }
]);

exports.txidInterval = normalizeParameters([
  {
    name: 'txidfra',
    type: 'integer'
  },
  {
    name: 'txidtil',
    type: 'integer'
  }
]);

