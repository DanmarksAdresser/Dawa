const { assert } = require('chai');
const {makeHref} = require('../commonMappers');
const _ = require('underscore');

const indices = require('../../ois2/indices');
const relations = require('../../ois2/relations');
const grbbrModels = require('../../ois2/parse-ea-model');
const bbrPath = '/bbr';
const entityPrefix = 'bbr_';

const getEntityName = grbbrModel => `${entityPrefix}${grbbrModel.name}`;
const plurals = {
  bygning: 'bygninger',
  bygningpåfremmedgrund: 'bygningpåfremmedgrund',
  tekniskanlæg: 'tekniskeanlæg',
  ejendomsrelation: 'ejendomsrelationer',
  enhed: 'enheder',
  enhedejerlejlighed: 'enhedejerlejlighed',
  etage: 'etager',
  grund: 'grunde',
  grundjordstykke: 'grundjordstykke',
  opgang: 'opgange',
  fordelingsareal: 'fordelingsarealer',
  fordelingaffordelingsareal: 'fordelingaffordelingsarealer'
};

const pathOverrides = {
  bygningpåfremmedgrund: 'bygningpaafremmedgrund',
  tekniskanlæg: 'tekniskeanlaeg'
};

const geojsonFields = {
  bygning: 'byg404Koordinat',
  tekniskanlæg: 'tek109Koordinat'
};

const bbrParameterNames = _.object(grbbrModels.map(model => [model.name, {'kommunekode': 'kommunekode'}]));
bbrParameterNames.bygning.byg021BygningensAnvendelse = 'anvendelseskode';
bbrParameterNames.enhed.enh020EnhedensAnvendelse = 'anvendelseskode';
bbrParameterNames.tekniskanlæg.tek020Klassifikation = 'klassifikationskode';

const getParameterName = (grbbrModel, attrName) => {
  if(bbrParameterNames[grbbrModel.name] && bbrParameterNames[grbbrModel.name][attrName]) {
    return bbrParameterNames[grbbrModel.name][attrName];
  }
  const relation = relations.getRelation(grbbrModel.name, attrName);
  if(relation) {
    return `${attrName}_id`;
  }
  return attrName;
};


const toFilterSpec = (grbbrModel, attributeName) => {
  const grbbrAttribute = grbbrModel.attributes.find(attr => attr.name === attributeName);
  const parameter = {
    name: getParameterName(grbbrModel, attributeName),
    type: grbbrAttribute.type === 'integer' ? 'integer' : 'string',
    multi: true
  };
  const columnName = grbbrAttribute.binding.column;
  return {
    parameter,
    columnName
  };
};

const filterSpecs = grbbrModels.reduce((acc, grbbrModel) => {
  const indexedAttrNames = ['id', 'status', 'kommunekode', ...indices.filter(index => index.entity === grbbrModel.name).map(index => index.columns[0])];
  acc[grbbrModel.name] = indexedAttrNames.map(attrName => toFilterSpec(grbbrModel, attrName));
  return acc;
}, {});

const externalRefs = {
    husnummer: baseUrl => id => {
      return {
        id,
        href: makeHref(baseUrl, 'adgangsadresse', [id])
      };
    },
    jordstykke: baseUrl => id => {
      return {
        id
      };
    },
    adresse: baseUrl => id => {
      return {
        id,
        href: makeHref(baseUrl, 'adresse', [id])
      }
    },
    kommune: baseUrl => kode => {
      return {
        kode,
        href: makeHref(baseUrl, 'kommune', [kode])
      };
    }
  }
;

const getQueryPath = (entityName) => {
  const plural = plurals[entityName];
  assert(plural, `plural not found for ${entityName}`);
  const override = pathOverrides[entityName];
  const path = override || plural;
  return `${bbrPath}/${encodeURIComponent(path)}`;
}

const makeBbrHref = (baseUrl, entityName, id) => {
  return `${baseUrl}${getQueryPath(entityName)}/${id}`;
};

const makeRefObj = (baseUrl, entityName, id) => {
  if (externalRefs[entityName]) {
    return externalRefs[entityName](baseUrl)(id);
  } else {
    return {
      id,
      href: makeBbrHref(baseUrl,entityName, id),
    }
  }
};

module.exports = {
  bbrPath,
  entityPrefix,
  plurals,
  externalRefs,
  getQueryPath,
  makeRefObj,
  getEntityName,
  geojsonFields,
  bbrParameterNames,
  filterSpecs,
  makeBbrHref
};