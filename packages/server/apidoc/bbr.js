const grbbrModels = require('../ois2/parse-ea-model');
const {getQueryPath, getEntityName} = require('../apiSpecification/bbr/common');
const parameterMap = require('../apiSpecification/bbr/parameters');
const {formatAndPagingParams} = require('./common');
const subtexts = {
  bygning: 'Find bygninger fra BBR.',
  enhed: 'Find enheder fra BBR.',
  ejendomsrelation: 'Find ejendomsrelationer fra BBR.',
  tekniskanlæg: 'Find tekniske anlæg fra BBR.',
  grund: 'Find grunde fra BBR.',
  grundjordstykke: 'Find relationer mellem grunde og jordstykker fra BBR.',
  fordelingsareal: 'Find fordelingsarealer fra BBR. Bemærk, at der kun er registreret få fordelingsarealer.',
  fordelingaffordelingsareal: 'Find fordelingen af fordelingsarealer fra BBR. Bemærk, at der kun er registreret få fordelingsarealer.',
  bygningpåfremmedgrund: 'Find relationer mellem bygning og ejendomsrelation, som repræsenterer en bygning påfremmed grund.',
  enhedejerlejlighed: 'Find Enhed-Ejerlejlighed relationer fra BBR.',
  etage: 'Find etager fra BBR.',
  opgang: 'Find opgange fra BBR'
};

const strukturParam = {
  name: 'struktur',
  doc: 'Angiv om der modtages en flad eller nestet svarstruktur. Mulige værdier: <code>flad</code>, <code>nestet</code>'
};
const queryDocs = grbbrModels.map(grbbrModel => {
  const path = getQueryPath(grbbrModel.name);
  const subtext = subtexts[grbbrModel.name];
  const propertyFilterParams = parameterMap[grbbrModel.name].propertyFilter;
  const propertyFilterParamDocs = propertyFilterParams.map(param => ({
    name: param.name,
    doc: `Returner resultater med de(n) angivne værdi(er) for ${param.name}`
  }));
  return {
    entity: getEntityName(grbbrModel),
    path,
    subtext,
    parameters: [...propertyFilterParamDocs, strukturParam, ...formatAndPagingParams],
    examples: []
  }
});

module.exports = [...queryDocs];