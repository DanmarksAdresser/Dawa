var registry = require('../registry');

module.exports = {
  propertyFilter: [
  ],
  datavask: [{
    name: 'betegnelse',
    type: 'string',
    required: true,
    schema: {
      type: 'string',
      maxLength: 100
    }
  }]
};

registry.addMultiple('adgangsadresse_history', 'parameterGroup', module.exports);
