const _ = require('underscore');
const { assert } = require('chai');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const xmlParser = require('fast-xml-parser');
const he = require('he');
const defmulti = require('@dawadk/common/src/defmulti');
const jp = require('jsonpath');
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

const descriptionOverrides = {
  ejendomsrelation: {
    id: 'Unik og uforanderlig identifikation af ejendomsrelationen igennem hele dens livscyklus'
  },
  bygningpåfremmedgrund: {
    id: 'Unik og uforanderlig identifikation af relationenen.'
  },
  enhedejerlejlighed: {
    id: 'Unik og uforanderlig identifikation af relationenen.'
  },
  grundjordstykke: {
    id: 'Unik og uforanderlig identifikation af relationenen.'
  }
};

const bindingTypes = require('../apiSpecification/replikering/bindings/binding-types');

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
  Bygning: [
    {
      name: 'jordstykke',
      type: {
        kind: 'reference',
        type: 'integer',
        sqlType: 'integer'
      },
      definition: ''
    },
    {
      name: 'husnummer',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'ejerlejlighed',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'grund',
      type: {
        'kind': 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    }],
  Ejendomsrelation: [
    {
      name: 'bygningPåFremmedGrund',
      type: {
        'kind': 'reference',
        type: 'integer',
        sqlType: 'bigint'
      },
      definition: ''
    },
    {
      name: 'ejerlejlighed',
      type: {
        'kind': 'reference',
        type: 'integer',
        sqlType: 'bigint'
      },
      definition: ''
    },
    {
      name: 'samletFastEjendom',
      type: {
        'kind': 'reference',
        type: 'integer',
        sqlType: 'bigint'
      },
      definition: ''
    }
  ],
  Enhed: [
    {
      name: 'adresseIdentificerer',
      type: {
        'kind': 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'etage',
      type: {
        'kind': 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'opgang',
      type: {
        'kind': 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    }
  ],
  Etage: [
    {
      name: 'bygning',
      type: {
        'kind': 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    }
  ],
  Grund: [
    {
      name: 'husnummer',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'bestemtFastEjendom',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    }
  ],
  Opgang: [
    {
      name: 'adgangFraHusnummer',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'bygning',
      type: {
        'kind': 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    }
  ],
  TekniskAnlæg: [
    {
      name: 'jordstykke',
      type: {
        kind: 'reference',
        type: 'integer',
        sqlType: 'integer'
      },
      definition: ''
    },
    {
      name: 'husnummer',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'enhed',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'ejerlejlighed',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'bygningPåFremmedGrund',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'bygning',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'grund',
      type: {
        'kind': 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    }
  ],
  Fordelingsareal: [
    {
      name: 'bygning',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    }
  ],
  FordelingAfFordelingsareal: [
    {
      name: 'enhed',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    },
    {
      name: 'fordelingsareal',
      type: {
        kind: 'reference',
        type: 'uuid',
        sqlType: 'uuid'
      },
      definition: ''
    }
  ]
};


const doc = parseGrunddataModel(path.join(__dirname, '2.4.0_BygningerOgBoliger.xml'));
const eaKodelister = jp.query(doc, '$.XMI.DKKodeliste')[0];
const eaDKEgenskaber = jp.query(doc, '$.XMI.DKEgenskab')[0];
const eaIdToAttrDefinitionMap = eaDKEgenskaber.reduce((acc, egenskab) => {
  acc[egenskab._base_Property] = egenskab._definition;
  return acc;
}, {});

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
        type,
        definition: eaIdToAttrDefinitionMap[attr._id] || type.definition || ''
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
    name: 'bygning',
    oisTable: 'CO50200t'
  },
  {
    name: 'ejendomsrelation',
    oisTable: 'CO50400t'
  },
  {
    name: 'enhed',
    oisTable: 'CO50500t'

  },
  {
    name: 'etage',
    oisTable: 'CO50800t'
  },
  {
    name: 'grund',
    oisTable: 'CO51000t'
  },
  {
    name: 'opgang',
    oisTable: 'CO51200t'
  },
  {
    name: 'tekniskanlæg',
    oisTable: 'CO51500t'
  },
  {
    name: 'fordelingsareal',
    oisTable: 'CO50900t'
  },
  {
    name: 'fordelingaffordelingsareal',
    oisTable: 'CO50700t'
  }
];

const filteredAttributes= {
  grundjordstykke: ['status'],
  bygningpåfremmedgrund: ['status'],
  enhedejerlejlighed: ['status'],
  enhed: ['bygning']
};

const importedEntityNames = entityOisTableMappings.map(entity => entity.name);

const parsedEntitiesWithoutCommonAttrs = eaClasses.map(parseClass);
const baseEntity = parsedEntitiesWithoutCommonAttrs.find(entity => entity.name === 'Bygværkselement');
const commonAttributes = baseEntity.attributes.filter(attr => !['registreringFra', 'registreringTil', 'virkningFra', 'virkningTil'].includes(attr.name));
const importedEntities = parsedEntitiesWithoutCommonAttrs
  .filter(entity => importedEntityNames.includes(entity.name.toLowerCase()))
  .map(entity => {
    return Object.assign({}, entity, {attributes: [...commonAttributes, ...entity.attributes]});
  });


const toSqlType = defmulti(type => type.kind);
toSqlType.method('primitive', (type => type.sqlType));
toSqlType.method('codeList', (type => 'text'));
toSqlType.method('reference', ({sqlType}) => sqlType);

const replicationTypes = {
  CharacterString: 'string',
  DateTime: 'timestamp',
  Integer: 'integer',
  Decimal: 'real',
  GM_Point: 'point2d',
  Identifikation: 'uuid',
  Real: 'real'
};

const toReplicationType = defmulti(type => type.kind);
toReplicationType.method('primitive', (type => replicationTypes[type.name]));
toReplicationType.method('codeList', (type => 'string'));
toReplicationType.method('reference', ({type}) => type);

const defaultBinding = (eaAttr => bindingTypes.column({
  attrName: eaAttr.name,
  column: toColumnName(eaAttr.name)
}));

const toBinding = defmulti(eaAttr => eaAttr.type.kind);
const primitiveEaAttrToBinding = defmulti(eaAttr => eaAttr.type.name);

toBinding.method('reference', eaAttr => {
  if(eaAttr.type.type === 'integer' && eaAttr.type.sqlType === 'bigint') {
    return bindingTypes.stringToNumber({
      attrName: eaAttr.name,
      column: toColumnName(eaAttr.name)
    });
  }
  else {
    return defaultBinding(eaAttr);
  }
});

toBinding.method('primitive', primitiveEaAttrToBinding);
toBinding.defaultMethod(defaultBinding);

primitiveEaAttrToBinding.method('GM_Point', eaAttr => bindingTypes.geometry({
  attrName: eaAttr.name,
  column: toColumnName(eaAttr.name)
}));

primitiveEaAttrToBinding.method('Integer', eaAttr => bindingTypes.stringToNumber({
  attrName: eaAttr.name,
  column: toColumnName(eaAttr.name)
}));

primitiveEaAttrToBinding.defaultMethod(defaultBinding);

const toColumnName = attrName => attrName.substring(0, 32).toLowerCase();

const toGrbbrAttr = (eaAttr) => {
  let description = eaAttr.definition;
  if(eaAttr.type.kind === 'codeList'){
    const codeList = codeLists.find(list => list.eaid === eaAttr.type.eaid);
    if(codeList) {
      description += ` For mulige værdier, se <a href="${codeList.vokabularium}">kodelisten.</a>`
    }
  }
  return {
    name: eaAttr.name,
    type: toReplicationType(eaAttr.type),
    sqlType: toSqlType(eaAttr.type),
    binding: toBinding(eaAttr),
    description
  };
};

const toGrbrrEntityModel = eaEntityModel => {
  const oisMapping = entityOisTableMappings.find(mapping => mapping.name === eaEntityModel.name.toLowerCase());
  const name = eaEntityModel.name.toLowerCase();
  const isFilteredAttr = attr => (filteredAttributes[name] || []).includes(attr.name);
  const result = {
    name,
    oisTable: oisMapping.oisTable,
    attributes: eaEntityModel.attributes.map(toGrbbrAttr).filter(attr => !isFilteredAttr(attr))
  };
  for(let [attrName, description] of Object.entries(descriptionOverrides[result.name] || {})) {
    const attr = result.attributes.find(attr => attr.name === attrName);
    assert(attr);
    attr.description = description;
  }
  return result;
};


const relationToGrbbrModel = (name, oisTable, attrNames, attrTypes) => {
  return {
    name,
    oisTable,
    attributes: [...commonAttributes.map(toGrbbrAttr), ..._.zip(attrNames, attrTypes).map(([name, type]) => ({
      name,
      type,
      sqlType: type,
      binding: bindingTypes.column({attrName: name, column: toColumnName(name)}),
      description: ''
    }))]
  };
};

const relationEntities =
  [relationToGrbbrModel('bygningpåfremmedgrund', 'CO50300t', ['bygning', 'bygningPåFremmedGrund'], ['uuid', 'uuid']),
    relationToGrbbrModel('enhedejerlejlighed', 'CO50600t', ['ejerlejlighed', 'enhed'], ['uuid', 'uuid']),
    relationToGrbbrModel('grundjordstykke', 'CO51100t', ['grund', 'jordstykke'], ['uuid', 'integer'])];


module.exports = [...importedEntities.map(toGrbrrEntityModel), ...relationEntities];