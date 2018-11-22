const definitions = require('../commonSchemaDefinitions');

exports.defaultSchemas = {
  integer: {type: 'integer'},
  real: {type: 'number'},
  boolean: {type: 'boolean'},
  string: {type: 'string'},
  uuid: definitions.UUID,
  timestamp: {type: 'string'},
  localdatetime: {type: 'string'},
  point2d: {type: 'object'},
  geometry: {type: 'object'}
};
