"use strict";

const namesAndKeys = require('../apiSpecification/ois/namesAndKeys');

module.exports = variant => {
  const pathPrefix = variant === 'full' ? 'ois' : 'bbrlight';
  return Object.keys(namesAndKeys).map(entity => {
    const { plural, key } = namesAndKeys [entity];
    return {
      entity: `BBR ${variant === 'full' ? 'intern ' : ''}${entity}`,
      heading: `BBR ${plural}`,
      sections: [
        {
          type: 'endpoint',
          heading: `BBR ${entity} søgning`,
          anchor: 'søgning',
          path: `/${pathPrefix}/${plural}`
        },
        ... key[0] !== 'ois_id' ? [{
          type: 'endpoint',
          heading: `BBR ${entity} enkeltopslag`,
          anchor: 'opslag',
          path: `/${pathPrefix}/${plural}/{id}`
        }] : []]
    }
  });
};
