"use strict";

const assert = require('assert');
const dar10TableModels = require('./dar10TableModels');
const types = require('../apiSpecification/replikering/bindings/binding-types');

const defaultReplikeringType = {
  uuid: 'uuid',
  timestamptz: 'timestamp',
  integer: 'integer',
  smallint: 'integer',
  text: 'string',
  float4: 'real',
  bigint: 'string'
};

const replikeringTypeOverrides = {
  Husnummer: {
    husnummertekst: 'string',
    husnummerretning: 'point2d'
  },
  DARKommuneinddeling: {
    kommunekode: 'string',
    kommuneinddeling: 'string'
  },
  DARSogneinddeling: {
    sognekode: 'string',
    sogneinddeling: 'string'
  },
  DARMenighedsrådsafstemningsområde: {
    mrafstemningsområde: 'string'
  },
  DARAfstemningsområde: {
    afstemningsområde: 'string'
  },
  Adressepunkt: {
    position: 'point2d'
  },
  NavngivenVej: {
    administreresafkommune: 'string',
    vejnavnebeliggenhed_vejnavnelinje: 'geometry',
    vejnavnebeliggenhed_vejnavneområde: 'geometry',
    vejnavnebeliggenhed_vejtilslutningspunkter: 'geometry'
  },
  NavngivenVejKommunedel: {
    kommune: 'string',
    vejkode: 'string'
  },
  SupplerendeBynavn: {
    supplerendebynavn1: 'string'
  }
};

const replikeringBindingOverrides = {
  Adressepunkt: [
    types.geometry({attrName: 'position'})
  ],
  Husnummer: [
    types.husnr({attrName: 'husnummertekst'}),
    types.geometry({attrName: 'husnummerretning'})
  ],
  NavngivenVej: [
    types.geometry({attrName: 'vejnavnebeliggenhed_vejnavnelinje'}),
    types.geometry({attrName: 'vejnavnebeliggenhed_vejnavneområde'}),
    types.geometry({attrName: 'vejnavnebeliggenhed_vejtilslutningspunkter'}),
    types.kode4({attrName: 'administreresafkommune'})
  ],
  NavngivenVejKommunedel: [
    types.kode4({attrName: 'kommune'}),
    types.kode4({attrName: 'vejkode'})
  ],
  DARKommuneinddeling: [
    types.kode4({attrName: 'kommunekode'}),
    types.kode4({attrName: 'kommuneinddeling'})
  ],
  SupplerendeBynavn: [
    types.numberToString({attrName: 'supplerendebynavn1'})
  ],
  DARSogneinddeling: [
    types.numberToString({attrName: 'sogneinddeling'}),
    types.kode4({attrName: 'sognekode'})
  ],
  DARMenighedsrådsafstemningsområde: [
    types.numberToString({attrName: 'mrafstemningsområde'})
  ],
  DARAfstemningsområde: [
    types.numberToString({attrName: 'afstemningsområde'})
  ]
};

const historyReplikeringModels = Object.entries(dar10TableModels.historyTableModels).reduce((memo, [entityName, tableModel]) => {
  const typeOverrides = replikeringTypeOverrides[entityName] || {};
  const rowkeyAttribute = {
    name: 'rowkey',
    type: 'integer',
    description: 'Unik ID for den angivne række. '
  }
  const virkningAttributes = [
    {
      name: 'virkningstart',
      type: 'timestamp',
      description: 'Startidspunktet for rækkens virkningstid.'
    },
    {
      name: 'virkningslut',
      type: 'timestamp',
      description: 'Sluttidspunktet for rækkens virkningstid. ',
      nullable: true
    }
  ];
  const otherAttributes = tableModel.columns.filter(col => !(['virkning', 'rowkey'].includes(col.name))).map(column => {
    const type = typeOverrides[column.name] ?
      typeOverrides[column.name] :
      defaultReplikeringType[column.sqlType];
    assert(type);
    return {
      name: column.name,
      type,
      description: 'Ikke tilgængelig',
      nullable: column.nullable
    };
  });
  const attributes = [rowkeyAttribute, ...virkningAttributes, ...otherAttributes];
  memo[entityName] = {
    key: ['rowkey'],
    attributes
  };
  return memo;
}, {});

const historyReplikeringBindings = Object.entries(dar10TableModels.historyTableModels).reduce((memo, [entityName, tableModel]) => {
  const table = tableModel.table;
  const virkningBinding = types.timestampInterval({attrName:'virkning'});
  memo[entityName] = {
    table,
    attributes: [ virkningBinding, ...(replikeringBindingOverrides[entityName] || [])],
    additionalParameters: [{
      name: 'id',
      type: 'string'
    }]
  };
  return memo;
}, {});

const currentReplikeringModels = Object.entries(dar10TableModels.currentTableModels).reduce((memo, [entityName, tableModel]) => {
  const typeOverrides = replikeringTypeOverrides[entityName] || {};
  const attributes = tableModel.columns.map(column => {
    const type = typeOverrides[column.name] ?
      typeOverrides[column.name] :
      defaultReplikeringType[column.sqlType];
    assert(type);
    return {
      name: column.name,
      type,
      description: 'Ikke tilgængelig',
      nullable: column.nullable
    };
  });
  memo[entityName] = {
    key: ['id'],
    attributes
  };
  return memo;
}, {});

const currentReplikeringBindings = Object.entries(dar10TableModels.currentTableModels).reduce((memo, [entityName, tableModel]) => {
  const table = tableModel.table;
  memo[entityName] = {
    table,
    attributes: replikeringBindingOverrides[entityName] || []
  };
  return memo;
}, {});

module.exports = {
  historyReplikeringModels,
  historyReplikeringBindings,
  currentReplikeringModels,
  currentReplikeringBindings
};