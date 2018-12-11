const _ = require('underscore');
const defaultBindings = require('./default-bindings');

const generateDDLStatements = (replicationModel, config, options) => {
  const sqls = [];
  const schema = config.replication_schema;
  sqls.push(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  if (options.dropBeforeCreate) {
    sqls.push(`DROP TABLE IF EXISTS ${schema}.transactions CASCADE`);
    sqls.push(`DROP TABLE IF EXISTS ${schema}.source_transactions CASCADE`);
    sqls.push(`DROP TYPE IF EXISTS ${schema}.operation_type CASCADE`);
  }
  sqls.push(`CREATE TABLE ${schema}.transactions(
  txid integer PRIMARY KEY,
  ts timestamptz)`);
  sqls.push(`CREATE TABLE ${schema}.source_transactions(
  source_txid integer,
  local_txid integer NOT NULL,
  entity text NOT NULL,
  type text NOT NULL,
  PRIMARY KEY (source_txid, entity))`);
  sqls.push(`CREATE TYPE ${schema}.operation_type AS ENUM ('insert', 'update', 'delete')`);
  for (let entity of config.entities) {
    const entityName = entity.name;
    const model = replicationModel[entityName];
    const binding = config.bindings[entityName];
    if (options.dropBeforeCreate) {
      sqls.push(`DROP TABLE IF EXISTS ${binding.table} CASCADE`);
      sqls.push(`DROP TABLE IF EXISTS ${binding.table}_changes CASCADE`);
    }
    const fieldDecl = entity.attributes.map(attributeName => {
      const replicationAttribute = _.findWhere(model.attributes, {name: attributeName});
      const defaultBinding = defaultBindings[replicationAttribute.type];
      const replikeringBinding = Object.assign({}, defaultBinding, binding.attributes[attributeName]);
      return `${replikeringBinding.columnName} ${replikeringBinding.sqlType}`
    }).join(',\n');
    const keyColumnNames = model.key.map(key => binding.attributes[key].columnName);
    const primaryKeyClause = `PRIMARY KEY(${keyColumnNames.join(', ')})`;
    sqls.push(`\
create table ${binding.table}(
${fieldDecl},
${primaryKeyClause}
)`
    );
    if (options.withChangeTables) {
      const changeTableName = `${binding.table}_changes`;
      sqls.push(`CREATE TABLE ${changeTableName} AS (SELECT NULL::integer as txid, NULL::${schema}.operation_type as operation, ${binding.table}.* FROM ${binding.table} WHERE false)`);
      sqls.push(`CREATE INDEX ON ${changeTableName}(txid)`);
      sqls.push(`CREATE INDEX ON ${changeTableName}(${keyColumnNames.join(',')})`);
    }
  }
  return sqls;
};

module.exports = {
  generateDDLStatements
};