const _ = require('underscore');
const {go} = require('ts-csp');
const toposort = require('toposort');
const { allProcessors } = require("./processors/all-processors");

const getExecutionOrder = components => {
  // map of table names to producing component
  const tableToProducingComponentMap = components.reduce((acc, component) => {
    for (let table of component.produces) {
      acc[table] = component;
    }
    return acc;
  }, {});

  const componentIdToDependenciesIds = components.reduce((acc, component) => {
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
      acc.push([depId, componentId]);
    }
    return acc;
  }, []);
  return toposort(graph);
};

const getChanges = (client, txid, tableName) => go(function*() {
  const changes = yield client.queryRows(`select operation, count(*) as ops from ${tableName}_changes where txid = $1 group by operation`, [txid]);
  return changes.reduce((acc, change) => {
    acc[change.operation] = change.ops;
    acc.total += change.ops;
    return acc;
  }, {total: 0});

});

const execute = (client, txid, rootComponents, executionMode, executionModeOverrides) => go(function*() {
  executionModeOverrides = executionModeOverrides || {};
  const allComponents = new Set(rootComponents);
  for(let component of allProcessors) {
    allComponents.add(component);
  }
  for(let component of rootComponents) {
    allComponents.add(component);
  }
  const componentIdMap = _.indexBy(Array.from(allComponents), 'id');
  const executionOrder = getExecutionOrder(Array.from(allComponents));
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
    yield component.execute(client, txid, executionModeOverrides[componentId] || executionMode, context);
    for(let table of component.produces) {
      context.changes[table] = yield getChanges(client, txid, table);
    }
  }
  return context;
});

module.exports = {
  execute
};