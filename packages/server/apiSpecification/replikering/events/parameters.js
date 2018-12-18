"use strict";

const normalizeParameters = require('../../common/parametersUtil').normalizeParameters;
const { keyParameters } = require('../commonParameters');
const commonSchemaDefinitions = require('../../commonSchemaDefinitions');
const moment = require('moment');
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
    type: 'string',
    schema: commonSchemaDefinitions.DateTimeParameter,
    validateFun: param => {
      const valid = moment(param).isValid();
      if(!valid) {
        throw `Ugyldigt tidspunkt: ${param} for parameter tidspunktfra`;
      }
    }
  }, {
    name: 'tidspunkttil',
    type: 'string',
    schema: commonSchemaDefinitions.DateTimeParameter,
    validateFun: param => {
      const valid = moment(param).isValid();
      if(!valid) {
        throw `Ugyldigt tidspunkt: ${param} for parameter tidspunkttil`;
      }
    }
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

