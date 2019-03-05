const _ = require('underscore');
const {go} = require('ts-csp');
const toposort = require('toposort');
const { allProcessors } = require("./processors/all-processors");
const logger = require('@dawadk/common/src/logger').forCategory('importerExecutor');
const {withImportTransaction} = require('../importUtil/transaction-util');

const getTablesInScope = (rootComponents, allComponents) => {
  const tablesInScope = new Set();
  for(let component of rootComponents) {
    for(let table of component.produces) {
      tablesInScope.add(table);
    }
  }
  /* eslint no-constant-condition: 0 */
  while(true) {
    const prevSize = tablesInScope.size;
    for(let component of allComponents) {
      for(let table of component.requires) {
        if(tablesInScope.has(table)) {
          for(let table of component.produces) {
            tablesInScope.add(table);
          }
        }
      }
    }
    const newSize = tablesInScope.size;
    if(prevSize === newSize) {
      break;
    }
  }
  return Array.from(tablesInScope);
};

const getExecutionOrder = (rootComponents, components) => {
  const tablesInScope = getTablesInScope(rootComponents, components);

  // map of table names to producing component
  const tableToProducingComponentMap = components.reduce((acc, component) => {
    for (let table of component.produces) {
      acc[table] = component;
    }
    return acc;
  }, {});

  const componentsInScopeSet = tablesInScope.reduce((acc, table) => {
    acc.add(tableToProducingComponentMap[table]);
    return acc;
  }, new Set());
  const componentsInScope = Array.from(componentsInScopeSet);

  const componentIdsInScope = new Set(_.pluck(componentsInScope, 'id'));

  const componentIdToDependenciesIds = componentsInScope.reduce((acc, component) => {
    const dependencies = new Set();
    for (let tableName of component.requires) {
      if(tableToProducingComponentMap[tableName]) {
        dependencies.add(tableToProducingComponentMap[tableName].id);
      }
    }
    acc[component.id] = Array.from(dependencies);
    return acc;
  }, {});
  const graph = Object.entries(componentIdToDependenciesIds).reduce((acc, [componentId, depIds]) => {
    for (let depId of depIds) {
      if(componentIdsInScope.has(depId) && componentIdsInScope.has(componentId)) {
        acc.push([depId, componentId]);
      }
    }
    return acc;
  }, []);
  const order = toposort(graph);

  for(let component of rootComponents) {
    if(!order.includes(component.id)) {
      order.push(component.id);
    }
  }
  return order;

};

const getChanges = (client, txid, tableName) => go(function*() {
  const changes = yield client.queryRows(`select operation, count(*)::integer as ops from ${tableName}_changes where txid = $1 group by operation`, [txid]);
  return changes.reduce((acc, change) => {
    acc[change.operation] = change.ops;
    acc.total += change.ops;
    return acc;
  }, {total: 0});

});

const execute = (client, txid, rootComponents, strategy) => go(function*() {
  const allComponents = new Set(rootComponents);
  for(let component of allProcessors) {
    allComponents.add(component);
  }

  const componentIdMap = _.indexBy(Array.from(allComponents), 'id');

  const executionOrder = getExecutionOrder(rootComponents, Array.from(allComponents));
  const context = { changes: {}};
  const initiallyRequiredTables = new Set();
  for(let component of rootComponents) {
    for(let table of component.requires) {
      initiallyRequiredTables.add(table);
    }
  }
  for(let table of initiallyRequiredTables) {
    context.changes[table] = yield getChanges(client, txid, table);
  }
  for(let componentId of executionOrder) {
    const component = componentIdMap[componentId];
    const before = Date.now();
    yield component.execute(client, txid, strategy, context);
    const after = Date.now();
    logger.info('Executed component', {componentId, duration: after-before});

    for(let table of component.produces) {
      context.changes[table] = yield getChanges(client, txid, table);
      logger.info('Table changes', {tableName: table, changes: context.changes[table]});
    }
  }
  return context;
});

/**
 * Execute, but roll back transaction to savepoint
 * before execution if the execution results in zero changes to tables.
 */
const executeRollbackable = (client, importerName, rootComponents, strategy) => go(function*() {
  yield client.query('SAVEPOINT before_import');
  const contextResult = yield withImportTransaction(client, importerName, txid => go(function*() {
    const contextResult = yield execute(client, txid, rootComponents, strategy);
    contextResult.txid = txid;
    return contextResult;
  }));
  const hasModified = Object.values(contextResult.changes).some(changeDesc => changeDesc.total > 0);
  contextResult.rollback = !hasModified && !contextResult['prevent-rollback'];
  if(contextResult.rollback) {
    logger.info('Rolling back import', {importer: importerName});
    yield client.query('ROLLBACK TO before_import');
  }
  yield client.query('RELEASE SAVEPOINT before_import');
  return contextResult;
});

module.exports = {
  execute,
  getExecutionOrder,
  executeRollbackable
};