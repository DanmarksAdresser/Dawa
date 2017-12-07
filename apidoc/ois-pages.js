"use strict";

const namesAndKeys = require('../apiSpecification/ois/namesAndKeys');

module.exports = Object.keys(namesAndKeys).map(entity => {
  const { plural, key } = namesAndKeys [entity];
  return {
    entity,
    heading: `BBR ${plural}`,
    sections: [
      {
        type: 'endpoint',
        heading: `OIS ${entity} søgning`,
        anchor: 'søgning',
        path: `/oislight/${plural}`
      },
      ... key[0] !== 'ois_id' ? [{
        type: 'endpoint',
        heading: `OIS ${entity} enkeltopslag`,
        anchor: 'opslag',
        path: `/oislight/${plural}/{id}`
      }] : []]
  }
});
