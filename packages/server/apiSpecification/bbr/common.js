const { assert } = require('chai');
const {makeHref} = require('../commonMappers');
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
  grundjordstykke: 'grundjordstykker',
  opgang: 'opgange',
  fordelingsareal: 'fordelingsarealer',
  fordelingaffordelingsareal: 'fordelingaffordelingsarealer'
};

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
    }
  }
;

const getQueryPath = (entityName) => {
  const plural = plurals[entityName];
  assert(plural, `plural not found for ${entityName}`);
  return `${bbrPath}/${plural}`;
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
  getEntityName
};