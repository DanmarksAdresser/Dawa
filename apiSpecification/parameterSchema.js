"use strict";

module.exports =  {
  uuid: {type: 'string',
    pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
  postnr: {
    type: ['integer', 'null'],
    minimum: 1,
    maximum: 9999},
  polygon: {type: 'array',
    items: { type: 'array'}},
  positiveInteger: {type: 'integer',
    minimum: 1
  },
  kode4: {
    type: ['integer', 'null'],
    minimum: 0,
    maximum: 9999
  }
};
