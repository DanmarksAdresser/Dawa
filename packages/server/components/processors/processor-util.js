const { go } = require('ts-csp');
const tableSchema = require('../../psql/tableModel');
const {
  materialize,
  recomputeMaterialization

} = require('@dawadk/import-util/src/materialize');

const fromMaterializations = (description, materializations) => {
  const produces = new Set();
  const requires = new Set();
  for(let materialization of materializations) {
    produces.add(materialization.table);
    for(let dependent of materialization.dependents) {
      requires.add(dependent.table);
    }
  }
  return {
    description,
    type: 'processor',
    produces: Array.from(produces),
    requires: Array.from(requires),
    executeIncrementally: (client, txid) => go(function*() {
      for(let materialization of materializations) {
        yield materialize(client, txid, tableSchema.tables, materialization);
      }
    }),
    execute: (client, txid) => go(function*() {
      for(let materialization of materializations) {
        yield recomputeMaterialization(client, txid, tableSchema.tables, materialization);
      }

    })
  }
};

const execute = (client, txid, components) => go(function*() {
  for(let component of components) {
    if(component.execute) {
      yield component.execute(client, txid);
    }
    else if (component.executeIncrementally) {
      yield component.executeIncrementally(client, txid);
    }
    else {
      throw new Error("No method to execute component");
    }
  }
});

const executeIncrementally = (client, txid, components) => go(function*() {
  for(let component of components) {
    if(component.executeIncrementally) {
      yield component.executeIncrementally(client, txid);
    }
    else if (component.execute) {
      yield component.execute(client, txid);
    }
    else {
      throw new Error("No method to execute component");
    }
  }
});

module.exports = {
  fromMaterializations,
  execute,
  executeIncrementally
};