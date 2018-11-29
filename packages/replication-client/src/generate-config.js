const _ = require('underscore');


module.exports = (replicationUrl, replicationSchema, replicationModel) => {
  const entityNames = Object.keys(replicationModel).filter(name => /dar_.*_aktuel/.test(name));
  return {
    replication_url: replicationUrl,
    replication_schema: replicationSchema,
    entities: entityNames.map(entityName => ({
      name: entityName,
      attributes: _.pluck(replicationModel[entityName].attributes, 'name')
    })),
    bindings: entityNames.reduce((acc, entityName) => {
      acc[entityName] = {
        table: entityName
      };
      return acc;
    }, {})
  }
};