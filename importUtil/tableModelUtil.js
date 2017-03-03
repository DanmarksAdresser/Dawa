"use strict";

const allColumnNames = tableModel => tableModel.columns.map(col => col.name);

const nonPrimaryColumnNames = tableModel =>
  allColumnNames(tableModel).filter(column => !tableModel.primaryKey.includes(column));

const insert = (client, tableModel, object) => {
  const columns = [];
  const values = [];
  const valueClauses = [];
  for(let column of allColumnNames(tableModel)) {
    if(typeof object[column] !== 'undefined') {
      columns.push(column);
      values.push(object[column]);
      valueClauses.push(`$${values.length}`);
    }
  }
  return client.query(
    `INSERT INTO ${tableModel.table}(${columns.join(', ')})
    VALUES (${valueClauses.join(', ')})`, values);
};

const update = (client, tableModel, object) => {
  const values = [];
  const updateClauses = [];
  const whereClauses = [];
  for(let column of nonPrimaryColumnNames(tableModel)) {
    const value = object[column];
    if(typeof value === 'undefined') {
      continue;
    }
    values.push(value);
    const parameter = `$${values.length}`;
    updateClauses.push(`${column} = ${parameter}`);
  }
  for(let column of tableModel.primaryKey) {
    const value = object[column];
    values.push(value);
    const parameter = `$${values.length}`;
    whereClauses.push(`${column} = ${parameter}`);
  }
  return client.query(
    `UPDATE ${tableModel.table} SET ${updateClauses.join(',')}
     WHERE ${whereClauses.join(' AND ')}`, values);
};

const del = (client, tableModel, key) => {
  const values = [];
  const whereClauses = [];
  for(let column of tableModel.primaryKey) {
    values.push(key[column]);
    whereClauses.push(`${column} = $${values.length}`);
  }
  return client.query(`DELETE FROM ${tableModel.table} WHERE ${whereClauses.join(' AND ')}`, values);
};

module.exports = {
  allColumnNames,
  nonPrimaryColumnNames,
  insert,
  update,
  del
};
