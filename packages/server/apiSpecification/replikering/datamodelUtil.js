const assert = require('assert');
const definitions = require('../commonSchemaDefinitions');
const schemaUtil = require('../../apiSpecification/schemaUtil');

const defaultSchemas = {
  integer: {type: 'integer'},
  real: {type: 'number'},
  boolean: {type: 'boolean'},
  string: {type: 'string'},
  uuid: definitions.UUID,
  timestamp: {type: 'string'},
  localdatetime: {type: 'string'},
  point2d: {type: 'object'},
  geometry: {type: 'object'},
  geometry3d: {type: 'object'}
};

const getDefaultSchema = (type, nullable) => {
  const schemaType = defaultSchemas[type];
  assert(schemaType);
  return nullable ? schemaUtil.nullable(schemaType) : schemaType;
};

module.exports = {
  defaultSchemas,
  getDefaultSchema
};