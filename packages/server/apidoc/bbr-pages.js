const grbbrModels = require('../ois2/parse-ea-model');
const {plurals, getEntityName, getQueryPath} = require('../apiSpecification/bbr/common');
module.exports = grbbrModels.map(grbbrModel => {
  const entityName = getEntityName(grbbrModel);
  return {
    entity: entityName,
    heading: `BBR ${plurals[grbbrModel.name]}`,
    sections: [
      {
        type: 'endpoint',
        heading: `BBR ${grbbrModel.name} søgning`,
        anchor: 'søgning',
        path: getQueryPath(grbbrModel.name)
      },
      {
        type: 'endpoint',
        heading: `BBR ${grbbrModel.name} enkeltopslag`,
        anchor: 'opslag',
        path: `${getQueryPath(grbbrModel.name)}/{id}`
      },
      {
        type: 'datadescription',
        heading: `Beskrivelse af BBR ${grbbrModel.name}`,
        anchor: 'databeskrivelse',
        lead: `<p>API'et returnerer følgende data for BBR ${grbbrModel.name}</p>`,
        entity: entityName,
        qualifier: 'json'
      }
    ]
  }
});