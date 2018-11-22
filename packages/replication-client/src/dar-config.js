const _ = require('underscore');

const replicationUrl = "https://dawa.aws.dk/replikering";
const replicationSchema = "dawa_replikering";

const replicationModel = require('@dawadk/server/apiSpecification/replikering/datamodel');

const entityNames = Object.keys(replicationModel).filter(modelName => /dar_.*_aktuel/.test(modelName));

const result = {
  replication_url: replicationUrl,
  replication_schema: replicationSchema,
  entities: entityNames.map(entityName => ({
    name: entityName,
    attributes: _.pluck(replicationModel[entityName].attributes, 'name')
  })),
  bindings: entityNames.reduce((acc, entityName) => {
    const tableName = entityName.substring(4, entityName.length - 7);
    acc[entityName] = {
      table: tableName
    };
    return acc;
  }, {})
};

module.exports = result;