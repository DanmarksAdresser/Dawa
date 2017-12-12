"use strict";

const namesAndKeys = require('../apiSpecification/ois/namesAndKeys');

module.exports = Object.keys(namesAndKeys).map(entity => {
  const { plural, key } = namesAndKeys [entity];
  return {
    entity,
    heading: `${plural}`,
    sections: [
      {
        type: 'endpoint',
        heading: `${entity} søgning`,
        anchor: 'søgning',
        path: `/bbrlight/${plural}`
      },
      ... key[0] !== 'ois_id' ? [{
        type: 'endpoint',
        heading: `${entity} enkeltopslag`,
        anchor: 'opslag',
        path: `/bbrlight/${plural}/{id}`
      }] : []]
  }
});
