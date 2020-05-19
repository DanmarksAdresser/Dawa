"use strict";

const fullOisModels= require('../../ois/oisModels');
const fieldSpec = require('./fieldSpec');
const schemas = require('./schemas');

const registry = require('../registry');
const filtersMap = require('./filterParameterSpec');
const  { normalizeParameters }  = require('../common/parametersUtil');

const modelsMap = {
  public: fullOisModels,
  full: fullOisModels
};

const parametertypeFromField = field => {
  const schema = schemas.schemaFromField(field, false);
  if(schema.type === 'string') {
    return 'string';
  }
  else if(schema.type === 'number') {
    return 'float'
  }
  else if(schema.type === 'integer') {
    return 'integer';
  }
  else {
    throw new Error('Could not decide parameter type for ' + JSON.stringify(field));
  }
};

const keyParams = (variant, oisApiModelName) => {
  const oisModels = modelsMap[variant];
  const oisModel  = oisModels[oisApiModelName];
  const filters = filtersMap[oisApiModelName];
  const field  = fieldSpec[variant][oisApiModelName].find(field => field.name === oisModel.key[0]);

  const filter = filters.find(filter => filter.field === field.name);
  if(!filter) {
    return [];
  }
  const result = {
    name: filter.name,
    type: parametertypeFromField(field),
    renameTo: filter.field,
    schema: filter.schema || schemas.schemaFromField(field, false),
  };
  if(filter.process) {
    result.process = filter.process;
  }
  return [result];
};

const filterParams = (variant, oisApiModelName) => {
  const oisModels = modelsMap[variant];
  const filters = filtersMap[oisApiModelName];
  return filters.map(filter => {
    const field  = fieldSpec[variant][oisApiModelName].find(field => field.name === filter.field);
    if(!field) {
      return null;
    }
    const sourceModel = field.source ? field.source.relation : oisApiModelName;
    const sourceName = field.source ? field.source.name : field.name;
    const sourceField = oisModels[sourceModel].fields.find(field  => field.name === sourceName);
    const result = {
      name: filter.name,
      type: parametertypeFromField(sourceField),
      renameTo: filter.field,
      schema: filter.schema || schemas.schemaFromField(sourceField, false),
      orderBy: filter.orderBy,
      multi: true
    };
    if(filter.process) {
      result.process = filter.process;
    }
    return result;
  }).filter(t => t !== null);
};

const medtagOphørte = [{
  name: 'medtagophørte',
  type: 'boolean'
}];

for(let variant of ['public', 'full']) {
  exports[variant] = {};
  for(let oisApiModelName of Object.keys(filtersMap)) {
    exports[variant][oisApiModelName] = {
      propertyFilter: normalizeParameters(filterParams(variant, oisApiModelName)),
      id: normalizeParameters(keyParams(variant, oisApiModelName)),
      medtagOphørte: normalizeParameters(medtagOphørte)
    };
    registry.addMultiple(`ois_${oisApiModelName}_${variant}`, 'parameterGroup', module.exports[variant][oisApiModelName]);
  }

}
