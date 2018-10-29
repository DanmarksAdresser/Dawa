const schema = require('../parameterSchema');

module.exports = {
  id: [{
    name: 'id',
    type: 'string',
    schema: schema.uuid,
    required: true
  }],
  entity: [{
    name: 'entitet',
    type: 'string',
    schema: {
      enum:['navngivenvej', 'husnummer', 'adresse']
    }
  }],
  attributes: [
    {
      name: 'attributter',
      type: 'string'
    }]
};