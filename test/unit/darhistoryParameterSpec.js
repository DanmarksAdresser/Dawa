const _ = require('underscore');
const { assert } = require('chai');

const parametersSpec= require('../../apiSpecification/history2/parameters');
const parameterParsing = require('../../parameterParsing');

const flatParameterSpec = [...parametersSpec.entity, ...parametersSpec.attributes];

const parseParameters = (parameterSpec, rawParams)=> {
  return parameterParsing.parseParameters(rawParams, _.indexBy(parameterSpec, 'name'));
};

const validateParameters = (parameterSpec, parsedParams) => {
  return parameterParsing.validateParameters(parsedParams, _.indexBy(parameterSpec, 'name'));
};

describe('DAR history attributes parameter', () => {

  it('Will accept an array of valid attributes', () => {
    const parameters = {
      entitet: 'husnummer',
      attributter: 'husnummer_navngivenvej_id,navngivenvej_vejnavn'
    };
    const {errors, params } = parseParameters(flatParameterSpec, parameters);
    assert.strictEqual(errors.length, 0);
    const validationErrors = validateParameters(flatParameterSpec, params);
    assert.strictEqual(validationErrors.length, 0);
  });

  it('Will reject an an invalid parameter', () => {
    const parameters = {
      entitet: 'husnummer',
      attributter: 'navngivenvej_id,foo'
    };
    const {errors, params } = parseParameters(flatParameterSpec, parameters);
    assert.strictEqual(errors.length, 0);
    const validationErrors = validateParameters(flatParameterSpec, params);
    assert.strictEqual(validationErrors.length, 1);
  });
});