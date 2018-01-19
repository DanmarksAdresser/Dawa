"use strict";

const namesAndKeys = require('../apiSpecification/ois/namesAndKeys');

module.exports = Object.keys(namesAndKeys).map(entity => {
  const { plural, key } = namesAndKeys [entity];
  return {
    entity: `BBR ${entity}`,
    heading: `BBR ${plural}`,
    sections: [
      {
        type: 'endpoint',
        heading: `BBR ${entity} søgning`,
        anchor: 'søgning',
        path: `/bbrlight/${plural}`
      },
      ... key[0] !== 'ois_id' ? [{
        type: 'endpoint',
        heading: `BBR ${entity} enkeltopslag`,
        anchor: 'opslag',
        path: `/bbrlight/${plural}/{id}`
      }] : []]
  }
});
