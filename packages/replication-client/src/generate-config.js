const _ = require('underscore');


module.exports = (replicationUrl, replicationSchema, replicationModel, options) => {
  const allEntityNames = Object.keys(replicationModel);
  const entityNames = options.entities ? options.entities : allEntityNames;
  for(let entityName of entityNames) {
    if(!allEntityNames.includes(entityName)) {
      throw new Error(`API does not expose entity ${entityName}`);
    }
  }
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