"use strict";

let registry = require('../registry');

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

['adresse', 'adgangsadresse'].forEach((entityName) => {
  registry.addMultiple(`${entityName}_datavask`, 'parameterGroup', module.exports);
});
