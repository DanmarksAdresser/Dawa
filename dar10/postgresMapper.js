"use strict";

/*
 * Map raw input objects supplied from DAR to objects suitable for our PostgreSQL model.
 */

const _ = require('underscore');

const databaseTypes = require('../psql/databaseTypes');
const logger = require('../logger').forCategory('darImport');
const nontemporal = require('../darImport/nontemporal');
const spec = require('./spec');


const Range = databaseTypes.Range;

const IMPORT_FILTER = {
};

function transformTimeInterval(entity, name) {
  var from = entity[name + 'fra'];
  delete entity[name + 'fra'];
  var to = entity[name + 'til'];
  delete entity[name + 'til'];
  if (!from) {
    from = null;
  }
  if (!to) {
    to = null;
  }
  if (from !== null && to !== null && Date.parse(from) > Date.parse(to)) {
    logger.error('Invalid interval', {
      field: name,
      from: from,
      to: to,
      entity: entity
    });
  }
  entity[name] = new Range(from, to, '[)');
}

function transformStatus(entity) {
  entity.status = entity.status ? parseInt(entity.status, 10) : null;
  return entity;
}

exports.createMapper = function (entityName, validate) {
  const seenRowkeys = new Set();
  return function (rawObject) {
    if(seenRowkeys.has(rawObject.rowkey)) {
      logger.error("Skipping row (duplicate rowkey)", {
        entityName,
        rowkey: rawObject.rowkey
      });
      return null;
    }
    else {
      seenRowkeys.add(rawObject.rowkey);
    }
    if (validate) {
      const validatorFn = spec.validateFns[entityName];
      if (!validatorFn(rawObject)) {
        logger.error("JSON schema validation of DAR 1.0 object failed", {errors: validatorFn.errors});
        throw new Error("JSON schema validation of DAR 1.0 object failed");
      }
    }
    for(let field of ['registrering', 'virkning', 'dbregistrering']) {
      if (rawObject[`${field}fra`] && rawObject[`${field}til`] &&
        Date.parse(rawObject[`${field}fra`]) > Date.parse(rawObject[`${field}til`])) {
        logger.info('Skipping row due to bad range', {row: rawObject});
        return null;
      }
    }
    for(let field of ['registrering', 'virkning']) {
      if (rawObject[`${field}fra`] && rawObject[`${field}til`] &&
        Date.parse(rawObject[`${field}fra`]) === Date.parse(rawObject[`${field}til`])) {
        logger.info(`Skipping row due to empty ${field} range`, {row: rawObject});
        return null;
      }
    }
    if (IMPORT_FILTER[entityName] && _.contains(IMPORT_FILTER[entityName], rawObject.id)) {
      logger.info('Skipping row due to filter', {row: rawObject});
      return null;
    }
    transformTimeInterval(rawObject, 'registrering');
    transformTimeInterval(rawObject, 'virkning');
    transformStatus(rawObject);
    if (spec.fieldTransforms[entityName]) {
      const fieldTransforms = spec.fieldTransforms[entityName];
      Object.keys(rawObject).forEach(fieldName => {
        if (fieldTransforms[fieldName]) {
          rawObject[fieldName] = fieldTransforms[fieldName](rawObject[fieldName]);
        }
      });
    }
    return rawObject;
  }
};

exports.columns = Object.keys(spec.schemas).reduce((memo, entityName) => {
  const schema = spec.schemas[entityName];
  const properties = Object.keys(schema.properties);
  memo[entityName] = _.without(
    properties, 'registreringfra', 'registreringtil', 'virkningfra', 'virkningtil')
    .concat(['registrering', 'virkning']);
  return memo;
}, {});

exports.tables = Object.keys(spec.schemas).reduce((memo, entityName) => {
  memo[entityName] = 'dar1_' + entityName;
  return memo;
}, {});

exports.nontemporalImpls = _.mapObject(spec.schemas, (schema, entityName) => {
  return nontemporal({
    table: exports.tables[entityName],
    columns: exports.columns[entityName],
    idColumns: ['rowkey']
  });
});

