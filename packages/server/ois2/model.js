const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const xmlParser = require('fast-xml-parser');
const he = require('he');
const defmulti = require('@dawadk/common/src/defmulti');
const jp = require('jsonpath');
const {createMapFn} = require('./xml-parsing');
const {
  materializationViewSql,
  getMaterialization
} = require('@dawadk/import-util/src/current-util');
const _ = require('underscore');
const { name } = require('@dawadk/import-util/src/table-diff-protocol');

const parseGrunddataModel = (filePath) => {
  const winEncodedBuffer = fs.readFileSync(filePath);
  const xmlStr = iconv.decode(winEncodedBuffer, "windows-1252");
  return xmlParser.parse(xmlStr, {
    attributeNamePrefix: '_',
    ignoreNameSpace: true,
    ignoreAttributes: false,
    parseNodeValue: false,
    attrValueProcessor: a => he.decode(a, {isAttributeValue: true}),//default is a=>a
    tagValueProcessor: a => he.decode(a)
  });
};


const primitiveAttributeTypes = [
  {
    kind: 'primitive',
    eaid: 'EAID_AF7C81A6_B1C1_4469_A09F_B97989024A14',
    name: 'CharacterString',
    sqlType: 'text'
  },
  {
    kind: 'primitive',
    eaid: 'EAID_826D309F_74BD_4536_B57D_05D7F792B82C',
    name: 'DateTime',
    sqlType: 'timestamptz'
  },
  {
    kind: 'primitive',
    eaid: 'EAID_ED4B232F_5EF1_4793_9DAE_32DC0D70A047',
    name: 'Integer',
    sqlType: 'bigint'
  },
  {
    kind: 'primitive',
    eaid: 'EAID_8367701C_2A96_4fe1_A0E9_4ABAC9DC0ED6',
    name: 'DateTime',
    sqlType: 'timestamptz'
  },
  {
    kind: 'primitive',
    eaid: 'EAID_4F50CD90_0E82_4cd6_8C9A_4F393B8BBAE7',
    name: 'Decimal',
    sqlType: 'numeric'
  },
  {
    kind: 'primitive',
    eaid: 'EAID_3CC5A3E8_2ECA_4e42_B09C_935BD5D3B64A',
    name: 'GM_Point',
    sqlType: 'geometry(Point,25832)'
  },
  {
    kind: 'primitive',
    eaid: 'EAID_3316BA11_6855_4d2a_B2A0_F1CC0767607C',
    name: 'Identifikation',
    sqlType: 'uuid'
  },
  {
    kind: 'primitive',
    eaid: 'EAID_61A592F5_3BE3_46a7_BB49_54169308D753',
    name: 'Real',
    sqlType: 'double precision'
  }
];

const referenceAttributes = {
  Bygning: [{
    name: 'jordstykke',
    type: {
      kind: 'reference',
      sqlType: 'integer'
    }
  }, {
    name: 'husnummer',
    type: {
      kind: 'reference',
      sqlType: 'uuid'
    }
  }, {
    name: 'ejerlejlighed',
    type: {
      kind: 'reference',
      sqlType: 'uuid'
    }
  }, {
    name: 'grund',
    type: {
      'kind': 'reference',
      sqlType: 'uuid'
    }
  }]
};


const doc = parseGrunddataModel(path.join(__dirname, '2.4.0_BygningerOgBoliger.xml'));
const eaKodelister = jp.query(doc, '$.XMI.DKKodeliste')[0];
const codeLists = eaKodelister.map(eaKodeliste => {
  return {
    kind: 'codeList',
    eaid: eaKodeliste._base_Enumeration,
    definition: eaKodeliste._definition,
    vokabularium: eaKodeliste._vokabularium
  };
});

const allAttributeTypes = [
  ...primitiveAttributeTypes,
  ...codeLists
];


const parseClass = json => {
  const name = json._name;
  const eaid = json._id;

  const attributes = json.ownedAttribute.reduce((acc, attr) => {
    const eaType = attr.type;
    const type = allAttributeTypes.find(attrType => attrType.eaid === eaType._idref);
    if (type) {
      acc.push({
        eaid: attr._id,
        name: attr._name,
        type
      });
    }
    return acc;
  }, referenceAttributes[json._name] || []);
  return {
    name,
    eaid,
    attributes
  }
};


const eaClasses = jp.query(doc, '$.XMI.Model.packagedElement.packagedElement[?(@._type=="uml:Class")]');

const entityOisTableMappings = [
  {
    name: 'Bygning',
    oisTable: 'CO50200t',
    publicAttributes: [
      'byg007bygningsnummer',
      'byg094revisionsdato',
      'byg122gyldighedsdato',
      'byg133kildeTilKoordinatsæt',
      'byg134kvalitetAfKoordinatsæt',
      'byg404koordinat',
      'byg406koordinatsystem',
      'grund',
      'jordstykke',
      'husnummer']
  },
  {
    name: 'Ejendomsrelation',
    oisTable: 'CO50400t',
    publicAttributes: [
      'bfenummer',
      'ejendomsnummer'
    ]
  },
  {
    name: 'Enhed',
    oisTable: 'CO50500t',
    publicAttributes: [
    ]

  },
  {
    name: 'Etage',
    oisTable: 'CO50800t',
    publicAttributes: [
    ]
  },
  {
    name: 'Grund',
    oisTable: 'CO51000t',
    publicAttributes: [
    ]
  },
  {
    name: 'Opgang',
    oisTable: 'CO51200t',
    publicAttributes: [
    ]
  },
  {
    name: 'TekniskAnlæg',
    oisTable: 'CO51500t',
    publicAttributes: [
    ]
  }
];

const importedEntityNames = entityOisTableMappings.map(entity => entity.name);

const parsedEntitiesWithoutCommonAttrs = eaClasses.map(parseClass);
const baseEntity = parsedEntitiesWithoutCommonAttrs.find(entity => entity.name === 'Bygværkselement');
const commonAttributes = baseEntity.attributes.filter(attr => !['registreringFra', 'registreringTil', 'virkningFra', 'virkningTil'].includes(attr.name));
console.dir(commonAttributes);
const importedEntities = parsedEntitiesWithoutCommonAttrs
  .filter(entity => importedEntityNames.includes(entity.name))
  .map(entity => {
    return Object.assign({}, entity, {attributes: entity.attributes = [...commonAttributes, ...entity.attributes]});
  });


const toSqlType = defmulti(type => type.kind);
toSqlType.method('primitive', (type => type.sqlType));
toSqlType.method('codeList', (type => 'text'));
toSqlType.method('reference', ({sqlType}) => sqlType);

const bbr_table_prefix = 'bbr_';

const attrSqlSpec = entity => entity.attributes.map(attr => {
  return `${attr.name} ${toSqlType(attr.type)}`;
});
const generateBitemporalSql = (entity, tableModel) => {
  const bitemporalColSpec = [`registrering tstzrange not null`, `virkning tstzrange not null`];
  const tableName = `${bbr_table_prefix}${entity.name}`;
  const colSpecs = [
    `rowkey integer not null`,
    ...bitemporalColSpec,
    ...attrSqlSpec(entity)];
  return `CREATE TABLE ${tableName}(
    ${colSpecs.join(',\n')},
    PRIMARY KEY(rowkey));\n
    CREATE INDEX ON ${tableName}(id)`
};

const generateHistorylSql = (entity, tableModel) => {
  const historyTemporalSpec = [`virkning tstzrange not null`];
  const tableName = `${bbr_table_prefix}${entity.name}_history`;
  const colSpecs = [
    `rowkey integer not null`,
    ...historyTemporalSpec,
    ...attrSqlSpec(entity)];
  return `CREATE TABLE ${tableName}(
    ${colSpecs.join(',\n')},
    PRIMARY KEY(rowkey));\n
    CREATE INDEX ON ${tableName}(id)`
};


const generateCurrentSql = (entity, tableModel) => {
  const tableName = `${bbr_table_prefix}${entity.name}_current`;
  const colSpecs = attrSqlSpec(entity);
  return `CREATE TABLE ${tableName}(
    ${colSpecs.join(',\n')},
    PRIMARY KEY(id))`
};

const generateSql = () => {
  let sql = '';
  for (let entity of importedEntities) {
    for (let suffix of ['', '_history', '_current']) {
      sql += `DROP TABLE IF EXISTS ${entity.table}${suffix} CASCADE;\n`;
      sql += `DROP TABLE IF EXISTS ${entity.table}${suffix}_changes CASCADE;\n`;
    }
  }
  for (let entity of importedEntities) {
    sql += generateBitemporalSql(entity) + ';\n';
    sql += generateHistorylSql(entity) + ';\n';
    sql += generateCurrentSql(entity) + ';\n';
  }
  return sql;
};


const toBitemporalTableModel = historyTableModel => {
  console.dir(historyTableModel);
  const entityName = historyTableModel.table.substring(0, historyTableModel.table.length - "_history".length);
  return {
    table: entityName,
    primaryKey: historyTableModel.primaryKey,
    columns: [{
      name: 'registrering'
    },
      ...historyTableModel.columns]
  };
};

const toCurrentTableModel = entity => {
  return {
    table: `${bbr_table_prefix}${entity.name}_current`,
    primaryKey: ['id'],
    columns: entity.attributes.map(attr => ({name: attr.name}))
  };
};

const toHistoryTableModel = currentTableModel => {
  const entityName = currentTableModel.table.substring(0, currentTableModel.table.length - "_current".length);
  return {
    table: `${entityName}_current`,
    primaryKey: ['rowkey'],
    columns: [
      {name: 'rowkey'},
      {name: 'virkning'},
      ...currentTableModel.columns
      ]
  };
};

const currentTableModels = importedEntities.map(toCurrentTableModel);
const historyTableModels = currentTableModels.map(toHistoryTableModel);
const bitemporalTableModels = historyTableModels.map(toBitemporalTableModel);

const publicCurrentModels = entityOisTableMappings.map(tableMapping => {
  const sharedPublicAttributeNames = ['rowkey', 'virkning', 'id',
    'kommunekode', ...commonAttributes.map(attr => attr.name)];
  const currentTableModel = historyTableModels.find(tableModel => tableModel.table === `bbr_${tableMapping.name}_current`);
  const allPublicAttributeNames = [...sharedPublicAttributeNames, ...tableMapping.publicAttributes];
  return {
    table: `bbrlight_${tableMapping.name}_current`,
    primaryKey: currentTableModel.primaryKey,
    columns: currentTableModel.columns.filter(col => allPublicAttributeNames.includes(name(col)))
  }
});

const publicHistoryModels = publicCurrentModels.map(toHistoryTableModel);

const allTableModels = [
  ...bitemporalTableModels,
  ...historyTableModels,
  ...currentTableModels,
  ...publicHistoryModels,
  ...publicCurrentModels
];
const oisImportSpecs = importedEntities.map(entity => {
  const oisTable = entityOisTableMappings.find(mapping => mapping.name === entity.name).oisTable;
  return {
    oisTable,
    oisRegister: 'grbbr',
    tableModel: historyTableModels.find(model => model.table === `bbr_${entity.name}_history`),
    mapFn: createMapFn(entity)
  }
});

const currentMaterializations = _.zip(historyTableModels, currentTableModels).map(([historyTableModel, currentTableModel]) => {
  return getMaterialization(historyTableModel, currentTableModel);
});

const publicCurrentMaterializations = _.zip(publicHistoryModels, publicCurrentModels).map(([historyTableModel, currentTableModel]) =>
  getMaterialization(historyTableModel, currentTableModel));

const viewSql = _.zip(historyTableModels, currentTableModels).map(([historyTableModel, currentTableModel]) => {
  return materializationViewSql(historyTableModel, currentTableModel, 'grbbr_virkning_ts');
}).join(';\n');


module.exports = {
  generateSql,
  bitemporalTableModels,
  historyTableModels,
  currentTableModels,
  publicCurrentModels,
  publicHistoryModels,
  allTableModels,
  oisImportSpecs,
  currentMaterializations,
  publicCurrentMaterializations,
  viewSql
};