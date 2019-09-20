const _ = require('underscore');
const getProvidedAttributes = require('./get-provided-attributes');
const assert = require('assert');
const { defaultSchemas } = require('../datamodelUtil');
const parameterSchema = require('../../parameterSchema');
const format = require('./format');
const sqlSelect = require('./sql-select');
const sqlSelectForApi = require('./sql-select-for-api');
const toColumn = require('./to-column');
const dbapi = require('../../../dbapi');
/**
 * Given an attribute name, and a *entity* binding, find the attribute binding that provides
 * the attribute specified by name.
 */
const getAttributeBinding = (attributeName, binding) => {
  for(let bindingAttr of binding.attributes) {
    if(getProvidedAttributes(bindingAttr).includes(attributeName)) {
      return bindingAttr;
    }
  }
  assert(false);
};

const defaultParameterTypes = {
  integer: 'integer',
  real: 'number',
  boolean: 'boolean',
  string: 'string',
  uuid: 'string',
  timestamp: 'string',
  localdatetime: 'string'
};

/**
 * Given a model attribute and a binding attribute,
 * return the type of a query parameter for that attribute.
 */
const getParameterType = (modelAttr, bindingAttr) => {
  if(bindingAttr.type === 'kode4') {
    return 'integer'
  }
  return defaultParameterTypes[modelAttr.type];
};

/**
 * Given a model attribute, and a binding attribute,
 * return the JSON schema for a parameter for that model attribute
 * @param modelAttr
 * @param bindingAttr
 */
const getParameterSchema = (modelAttr, bindingAttr) => {
  if(bindingAttr.type === 'kode4') {
    return parameterSchema.kode4;
  }
  return defaultSchemas[modelAttr.type];
};

const getModelAttr = (attrName, entityModel) => _.findWhere(entityModel.attributes, {name: attrName});

const getParameterSpec = (attrName, entityModel, entityBinding) => {
  const modelAttr = getModelAttr(attrName, entityModel);
  const attrBinding = getAttributeBinding(attrName, entityBinding);
  return {
    name: attrName,
    type: getParameterType(modelAttr, attrBinding),
    schema: getParameterSchema(modelAttr, attrBinding)
  };
};

const legacyFormatter = (attrName, entityBinding) => {
  const attrBinding = getAttributeBinding(attrName, entityBinding);
  return val => {
    const src = {};
    src[attrBinding.column || attrName] = val;
    const dst = {};
    format(attrBinding, src, dst);
    return dst[attrName];
  };
};

/**
 * Return the SQL column an attribute maps to.
 * Behavior undefined if attribute does not map to a single column.
 */
const getColumnName = (attrName, entityBinding) => {
  const attrBinding = getAttributeBinding(attrName, entityBinding);
  assert(attrBinding.column, "Column for " + attrName);
  return attrBinding.column;
};

const createRowFormatter = entityBinding => dbRow => {
  const formattedRow = {};
  for(let attrBinding of entityBinding.attributes) {
    format(attrBinding, dbRow, formattedRow);
  }
  return formattedRow;
};

const makeSelectClause = attributeBindings =>
  attributeBindings
    .map(binding => sqlSelect(binding))
    .reduce((acc, select) => acc.concat(select), [])
    .map(([select, as]) => `${select} AS ${as}`)
    .join(', ');

const typesRequiringSrid = ['geometry'];

const addSelectForLookup = (sqlParts, attributeBindings, params) => {
  const requiresSrid = attributeBindings.some(binding => typesRequiringSrid.includes(binding.type));
  const opts = {};
  if(requiresSrid) {
    const srid = params.srid || 4326;
    const sridAlias = dbapi.addSqlParameter(sqlParts, srid);
    Object.assign(opts, {srid, sridAlias});
  }
  const clauses =  attributeBindings.map(binding => sqlSelectForApi(binding, null, opts))
    .reduce((acc, select) => acc.concat(select), [])
    .map(([select, as]) => `${select} AS ${as}`);
  sqlParts.select = [...sqlParts.select, ...clauses ];
};

const getAllProvidedAttributes = attributeBindings =>
  attributeBindings
    .map(getProvidedAttributes)
    .reduce((acc, attrs) => acc.concat(attrs), []);

const getColumnSpec = (filterParameters, binding) => {
  const columns = filterParameters.reduce((memo, filterParam) => {
    const bindingAttr = binding.attributes.find(attr => getProvidedAttributes(attr).includes(filterParam.name));
    assert(bindingAttr, `Found column for parameter ${JSON.stringify(filterParam)}`)
    const columnSpec = toColumn(bindingAttr);
    memo[filterParam.name] = columnSpec;
    return memo;
  }, {});
  return columns;
};

module.exports = {
  getParameterType,
  getParameterSchema,
  getAttributeBinding,
  getParameterSpec,
  legacyFormatter,
  getColumnName,
  createRowFormatter,
  makeSelectClause,
  getAllProvidedAttributes,
  getColumnSpec,
  addSelectForLookup
};