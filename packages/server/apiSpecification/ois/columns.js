"use strict";

const _ = require('underscore');

const dbapi = require('../../dbapi');
const oisCommon = require('../../ois/common');
const oisApiModels = require('./oisApiModels');
const namesAndKeys = require('./namesAndKeys');
const computedColumns = require('./computedColumns');

module.exports = _.mapObject(oisApiModels, (apiModel, modelName) => {
  let primaryColumns = oisCommon.postgresColumnNames[modelName].reduce((memo, columnName) => {
    memo[columnName] = {
      column: `${apiModel.alias}.${columnName.toLowerCase()}`
    };
    return memo;
  }, {});
  if(computedColumns[modelName]) {
    Object.assign(primaryColumns, computedColumns[apiModel.primaryRelation](apiModel.alias));
  }
  const secondaryColumnMaps = apiModel.secondaryRelations.filter(relation => !relation.aggregate).map(secondaryRelation => {
    const secondaryTableColumnNames = oisCommon.postgresColumnNames[secondaryRelation.relationName];
    let columns =  secondaryTableColumnNames.reduce((memo, columnName) => {
      memo[`${secondaryRelation.relationName}_${columnName}`] = {
        column: `${secondaryRelation.alias}.${columnName.toLowerCase()}`
      };
      return memo;
    }, {});
    if(computedColumns[secondaryRelation.relationName]) {
      const unprefixedComputedCols = computedColumns[secondaryRelation.relationName](secondaryRelation.alias);
      const prefixedComputedCols = Object.keys(unprefixedComputedCols).reduce((memo, unprefixed) => {
        const value = unprefixedComputedCols[unprefixed];
        memo[`${secondaryRelation.relationName}_${unprefixed}`] = value;
        return memo;
      }, {});
      Object.assign(columns, prefixedComputedCols);
    }
    return columns;
  });

  const aggregateColumnMap = apiModel.secondaryRelations.filter(relation => relation.aggregate)
    .reduce((memo, relation) => {
      const plural = namesAndKeys[relation.relationName].plural;
      const tableName = oisCommon.dawaTableName(relation.relationName);
      const whereClauses = relation.clauses.map(clause => `${clause[0]} = ${clause[1]}`).join(' AND');
      memo[plural] = {
        select: () => `(SELECT json_agg(${relation.alias}) FROM ${tableName} ${relation.alias} WHERE ophoert_ts IS NULL AND ${whereClauses})`
      }
      return memo;
    }, {});

  const allColumnMaps = secondaryColumnMaps.reduce((memo, map) => memo.concat([map]), [primaryColumns]).concat([aggregateColumnMap]);

  if (apiModel.geojson) {
    const relation = apiModel.geojson.relation;
    const column = apiModel.geojson.field;
    const alias = relation === apiModel.primaryRelation ?
      apiModel.alias :
      _.findWhere(apiModel.secondaryRelations, {
        relationName: relation
      }).alias;
    allColumnMaps.push({
      geom_json: {
        select: function (sqlParts, sqlModel, params) {
          var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
          return `ST_AsGeoJSON(ST_Transform(${alias}.${column},${sridAlias}::integer))`;
        }
      }
    });
  }

  return Object.assign.apply(null, [{}].concat(allColumnMaps));
});
