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
  NavngivenVejKommunedel: [
    "a0a0b7fe-6f7e-11e6-bceb-063320a53a26",
    "a0a0b826-6f7e-11e6-bcec-063320a53a26",
    "a08fd01a-6f7e-11e6-bff0-063320a53a26",
    "a0cc2452-6f7e-11e6-b480-063320a53a26",
    "a0a82f0c-6f7e-11e6-a697-063320a53a26",
    "a0a82f34-6f7e-11e6-a698-063320a53a26",
    "a0867a06-6f7e-11e6-ab02-063320a53a26",
    "a085f96e-6f7e-11e6-a83e-063320a53a26",
    "a09916ac-6f7e-11e6-b2f9-063320a53a26",
    "a0991684-6f7e-11e6-b2f8-063320a53a26",
    "a079f678-6f7e-11e6-88ed-063320a53a26",
    "a0c240c2-6f7e-11e6-bd26-063320a53a26",
    "a0b2c9d0-6f7e-11e6-977c-063320a53a26",
    "a09f3fd2-6f7e-11e6-b50b-063320a53a26",
    "a0aa3c02-6f7e-11e6-b18c-063320a53a26",
    "a0aa3bda-6f7e-11e6-b18b-063320a53a26",
    "a080a086-6f7e-11e6-ab2a-063320a53a26",
    "a080a05e-6f7e-11e6-ab29-063320a53a26",
    "a0809ffa-6f7e-11e6-ab27-063320a53a26",
    "a0809fd2-6f7e-11e6-ab26-063320a53a26",
    "a080a0ae-6f7e-11e6-ab2b-063320a53a26",
    "a080a022-6f7e-11e6-ab28-063320a53a26",
    "a0ad0374-6f7e-11e6-b471-063320a53a26",
    "a0ad0338-6f7e-11e6-b470-063320a53a26",
    "a0a54a3a-6f7e-11e6-bd76-063320a53a26",
    "a0a54a62-6f7e-11e6-bd77-063320a53a26",
    "a0bca978-6f7e-11e6-a810-063320a53a26",
    "a0bca950-6f7e-11e6-a80f-063320a53a26",
    "a0a7ccba-6f7e-11e6-a485-063320a53a26",
    "a0a7cc92-6f7e-11e6-a484-063320a53a26",
    "a0c69cda-6f7e-11e6-966f-063320a53a26",
    "a0c69d34-6f7e-11e6-9671-063320a53a26",
    "a0ace1e6-6f7e-11e6-bfbd-063320a53a26",
    "a0ace218-6f7e-11e6-bfbe-063320a53a26",
    "a0934cfe-6f7e-11e6-93c3-063320a53a26",
    "a0934d26-6f7e-11e6-93c4-063320a53a26",
    "a0ad8632-6f7e-11e6-b73e-063320a53a26",
    "a0ad860a-6f7e-11e6-b73d-063320a53a26",
    "a08b5652-6f7e-11e6-ae1a-063320a53a26",
    "a08b562a-6f7e-11e6-ae19-063320a53a26",
    "a098cf76-6f7e-11e6-b178-063320a53a26",
    "a098cf4e-6f7e-11e6-b177-063320a53a26",
    "a09379ea-6f7e-11e6-94b6-063320a53a26",
    "a0937a3a-6f7e-11e6-94b8-063320a53a26",
    "a08d1be0-6f7e-11e6-b6f2-063320a53a26",
    "a08d1cf8-6f7e-11e6-b6f6-063320a53a26",
    "a0af3a7c-6f7e-11e6-afa1-063320a53a26",
    "a0ae8cee-6f7e-11e6-bcd0-063320a53a26",
    "a099c142-6f7e-11e6-b691-063320a53a26",
    "a099c160-6f7e-11e6-b692-063320a53a26",
    "a0aea846-6f7e-11e6-bd63-063320a53a26",
    "a0af609c-6f7e-11e6-b064-063320a53a26",
    "a0acfa8c-6f7e-11e6-b43d-063320a53a26",
    "a0acfa64-6f7e-11e6-b43c-063320a53a26",
    "a0adb56c-6f7e-11e6-b83f-063320a53a26",
    "a0adb616-6f7e-11e6-b840-063320a53a26",
    "a0a7ae38-6f7e-11e6-a3dd-063320a53a26",
    "a0a7562c-6f7e-11e6-a203-063320a53a26",
    "a0a07dfc-6f7e-11e6-bbb4-063320a53a26",
    "a0a07dd4-6f7e-11e6-bbb3-063320a53a26",
    "a0b3b30e-6f7e-11e6-9c67-063320a53a26",
    "a0b3b336-6f7e-11e6-9c68-063320a53a26",
    "a0c53d7c-6f7e-11e6-8f00-063320a53a26",
    "a0c53da4-6f7e-11e6-8f01-063320a53a26"
  ]
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
  return function (rawObject) {
    if (validate) {
      const validatorFn = spec.validateFns[entityName];
      if (!validatorFn(rawObject)) {
        logger.error("JSON schema validation of DAR 1.0 object failed", {errors: validatorFn.errors});
        throw new Error("JSON schema validation of DAR 1.0 object failed");
      }
    }
    let invalid = false;
    ['registrering', 'virkning', 'dbregistrering'].forEach((field) => {
      if (rawObject[`${field}fra`] && rawObject[`${field}til`] &&
        Date.parse(rawObject[`${field}fra`]) > Date.parse(rawObject[`${field}til`])) {
        logger.info('Skipping row due to bad range', {row: rawObject});
        invalid = true;
      }
      if (IMPORT_FILTER[entityName] && _.contains(IMPORT_FILTER[entityName], rawObject.id)) {
        logger.info('Skipping row due to filter', {row: rawObject});
        invalid = true;
      }
    });
    if (invalid) {
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

