"use strict";

const assert = require('assert');
const dar10TableModels = require('./dar10TableModels');
const {formatHusnr} = require('../apiSpecification/husnrUtil');
const {kode4String, numberToString} = require('../apiSpecification/util');
const { selectIsoDateUtc: selectIsoTimestampUtc} = require('../apiSpecification/common/sql/sqlUtil');


const defaultReplikeringType = {
  uuid: 'uuid',
  timestamptz: 'timestamp',
  integer: 'integer',
  smallint: 'integer',
  text: 'string',
  float4: 'real'
};

const replikeringTypeOverrides = {
  Husnummer: {
    husnummertekst: 'string',
    husnummerretning: 'point2d'
  },
  DARKommuneinddeling: {
    kommunekode: 'string'
  },
  DARSogneinddeling: {
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
  Adressepunkt: {
    position: {
      selectTransform: col => `ST_AsGeoJSON(${col})`,
      formatter: JSON.parse

    }
  },
  Husnummer: {
    husnummertekst: {
      formatter: formatHusnr
    },
    husnummerretning: {
      selectTransform: col => `ST_AsGeoJSON(${col})`,
      formatter: JSON.parse
    }
  },
  NavngivenVej: {
    vejnavnebeliggenhed_vejnavnelinje: {
      selectTransform: col => `ST_AsGeoJSON(${col})`,
      formatter: JSON.parse
    }
    ,
    vejnavnebeliggenhed_vejnavneområde: {
      selectTransform: col => `ST_AsGeoJSON(${col})`,
      formatter: JSON.parse
    }
    ,
    vejnavnebeliggenhed_vejtilslutningspunkter: {
      selectTransform: col => `ST_AsGeoJSON(${col})`,
      formatter: JSON.parse
    },
    administreresafkommune: {
      formatter: kode4String
    }
  },
  NavngivenVejKommunedel: {
    kommune: {
      formatter: kode4String
    },
    vejkode: {
      formatter: kode4String
    }
  },
  DARKommuneinddeling: {
    kommunekode: {
      formatter: kode4String
    },
    kommuneinddeling: numberToString
  },
  SupplerendeBynavn: {
    supplerendebynavn1: {
      formatter: numberToString
    }
  },
  DARSogneinddeling: {
    sogneinddeling: {
      formatter: numberToString
    }
  },
  DARMenighedsrådsafstemningsområde: {
    mrafstemningsområde: {
      formatter: numberToString
    }
  },
  DARAfstemningsområde: {
    afstemningsområde: {
      formatter: numberToString
    }
  }
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
  const virkningBindings = {
    virkningstart: {
      selectTransform: col => selectIsoTimestampUtc(`lower(virkning)`)
    },
    virkningslut: {
      selectTransform: col => selectIsoTimestampUtc('upper(virkning)')
    }
  };
  memo[entityName] = {
    table,
    attributes: Object.assign({}, virkningBindings, replikeringBindingOverrides[entityName] || {}),
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
    attributes: replikeringBindingOverrides[entityName] || {}
  };
  return memo;
}, {});

module.exports = {
  historyReplikeringModels,
  historyReplikeringBindings,
  currentReplikeringModels,
  currentReplikeringBindings
};