const { assert } = require('chai');
const grbbrModels = require('./parse-ea-model');
const relations = [{
  entity: 'bygning',
  attribute: 'grund',
  references: 'grund'
}, {
  entity: 'bygning',
  attribute: 'husnummer',
  references: 'husnummer'
}, {
  entity: 'bygning',
  attribute: 'jordstykke',
  references: 'jordstykke',
  referencedAttribute: 'dagi_id'
}, {
  entity: 'bygning',
  attribute: 'ejerlejlighed',
  references: 'ejendomsrelation'
}, {
  entity: 'enhed',
  attribute: 'adresse',
  references: 'adresse'
}, {
  entity: 'enhed',
  attribute: 'etage',
  references: 'etage'
}, {
  entity: 'enhed',
  attribute: 'opgang',
  references: 'opgang'
}, {
  entity: 'enhed',
  attribute: 'bygning',
  references: 'bygning'
}, {
  entity: 'etage',
  attribute: 'bygning',
  references: 'bygning'
}, {
  entity: 'grund',
  attribute: 'husnummer',
  references: 'husnummer'
}, {
  entity: 'grund',
  attribute: 'bestemtFastEjendom',
  references: 'ejendomsrelation'
}, {
  entity: 'opgang',
  attribute: 'husnummer',
  references: 'husnummer'
}, {
  entity: 'opgang',
  attribute: 'bygning',
  references: 'bygning'
}, {
  entity: 'tekniskanlæg',
  attribute: 'jordstykke',
  references: 'jordstykke',
  referencedAttribute: 'dagi_id'
}, {
  entity: 'tekniskanlæg',
  attribute: 'husnummer',
  references: 'husnummer'
}, {
  entity: 'tekniskanlæg',
  attribute: 'enhed',
  references: 'enhed'
}, {
  entity: 'tekniskanlæg',
  attribute: 'ejerlejlighed',
  references: 'ejendomsrelation'
}, {
  entity: 'tekniskanlæg',
  attribute: 'bygningPåFremmedGrund',
  references: 'ejendomsrelation'
}, {
  entity: 'tekniskanlæg',
  attribute: 'bygning',
  references: 'bygning'
}, {
  entity: 'tekniskanlæg',
  attribute: 'grund',
  references: 'grund'
}, {
  entity: 'grundjordstykke',
  attribute: 'grund',
  references: 'grund'
}, {
  entity: 'grundjordstykke',
  attribute: 'jordstykke',
  references: 'jordstykke'
}, {
  entity: 'bygningpåfremmedgrund',
  attribute: 'bygning',
  references: 'bygning'
}, {
  entity: 'bygningpåfremmedgrund',
  attribute: 'bygningPåFremmedGrund',
  references: 'ejendomsrelation'
}, {
  entity: 'enhedejerlejlighed',
  attribute: 'ejerlejlighed',
  references: 'ejendomsrelation'
}, {
  entity: 'enhedejerlejlighed',
  attribute: 'enhed',
  references: 'enhed'
}, {
  entity: 'fordelingsareal',
  attribute: 'bygning',
  references: 'bygning'
}, {
  entity: 'fordelingaffordelingsareal',
  attribute: 'fordelingsareal',
  references: 'fordelingsareal'
}, {
  entity: 'fordelingaffordelingsareal',
  attribute: 'enhed',
  references: 'enhed'
}, ...grbbrModels.map(model => ({
  entity: model.name,
  attribute: 'kommunekode',
  references: 'kommune',
  as: 'kommune'
}))];

const getRelationsForEntity = entityName => relations.filter(relation => relation.entity === entityName);
const getRelation = (entityName, attribute) => {
  const results = getRelationsForEntity(entityName).filter(relation => relation.attribute === attribute);
  assert(results.length <= 1);
  return results.length === 0 ? null : results[0];
};

module.exports = {
  relations,
  getRelationsForEntity,
  getRelation
};