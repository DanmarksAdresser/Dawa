"use strict";

const allColumnNames = tableModel => tableModel.columns.map(col => col.name);

module.exports = {
  allColumnNames
};
