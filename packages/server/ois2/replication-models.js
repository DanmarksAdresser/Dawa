const grbbrModels = require('./parse-ea-model');
const tableModels = require('./table-models');
const bindingTypes = require('../apiSpecification/replikering/bindings/binding-types');

const rowkeyAttribute = {
  name: 'rowkey',
  type: 'integer',
  description: 'Unik ID for den angivne række. '
};

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

const registreringAttributes = [
  {
    name: 'registreringstart',
    type: 'timestamp',
    description: 'Startidspunktet for rækkens registreringstid.'
  },
  {
    name: 'registreringslut',
    type: 'timestamp',
    description: 'Sluttidspunktet for rækkens registreringstid. ',
    nullable: true
  }
];

const toReplicationModel = (grbbrModel, temporality) => {
  const temporalAttributes = {
    current: [],
    history: [rowkeyAttribute, ...virkningAttributes],
    bi: [rowkeyAttribute, ...virkningAttributes, ...registreringAttributes]
  };
  const keys = {
    current: ['id'],
    history: ['rowkey'],
    bi: ['rowkey']
  };
  const grbbrAttributes =  grbbrModel.attributes;
  const replicationAttrs = grbbrAttributes.map(attr => {
    return {
      name: attr.name,
      type: attr.type,
      nullable: true,
      description: attr.description || ''
    };
  });
  return {
    key: keys[temporality],
    attributes: [...temporalAttributes[temporality], ...replicationAttrs]
  };
};

const toReplicationBinding = (grbbrModel, temporality) => {
  const tableModel = tableModels.getTableModel(grbbrModel.name, temporality);
  const temporalBindings = {
    current: [],
    history: [bindingTypes.timestampInterval({attrName: 'virkning'})],
    bi: [bindingTypes.timestampInterval({attrName: 'virkning'}), bindingTypes.timestampInterval({attrName: 'registrering'})],
  };
  const grbbrAttributes =  grbbrModel.attributes;
  const attrBindings = grbbrAttributes.map(attr => attr.binding);
  return {
    table: tableModel.table,
    attributes: [...temporalBindings[temporality], ...attrBindings]
  }
};

const getEntityName = ( grbbrModel, temporality) => {
  const prefix = 'bbr';
  const suffixes = {
    bi: '',
    history: '_historik',
    current: '_aktuel'
  };

  return `${prefix}_${grbbrModel.name}${suffixes[temporality]}`;
};



const replicationCombinations = ['bi', 'history', 'current'].reduce((acc, temporality) => {
  for(let grbbrModel of grbbrModels) {
    acc.push({temporality, grbbrModel});
  }
  return acc;
}, []);

const models = replicationCombinations.map(({temporality, grbbrModel}) =>
  ({temporality, grbbrModel, model: toReplicationModel(grbbrModel, temporality)}));

const bindings = replicationCombinations.map(({temporality, grbbrModel}) =>
  ({temporality, grbbrModel, binding: toReplicationBinding(grbbrModel, temporality)}));

const modelMap = models.reduce((acc, {temporality, grbbrModel, model}) => {
  acc[getEntityName(grbbrModel, temporality)] = model;
  return acc;
}, []);

const bindingMap = bindings.reduce((acc, {temporality, grbbrModel, binding}) => {
  acc[getEntityName(grbbrModel, temporality)] = binding;
  return acc;
}, []);


const getReplicationModel = (requiredName, requiredTemporality) => models.find(({temporality, grbbrModel}) =>
  temporality ===requiredTemporality && requiredName === grbbrModel.name).model;

const getReplicationBinding = (requiredName, requiredTemporality) => bindings.find(({temporality, grbbrModel}) =>
   temporality ===requiredTemporality && requiredName === grbbrModel.name).binding;

module.exports = {
  // models,bindings,
  modelMap,
  bindingMap,
  getReplicationModel,
  getReplicationBinding
};