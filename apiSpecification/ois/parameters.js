"use strict";

const oisModels= require('../../ois/oisModels');
const fieldSpec = require('./fieldSpec');
const schemas = require('./schemas');

const registry = require('../registry');
const filtersMap = require('./filterParameterSpec');

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

const keyParams = oisApiModelName => {
  const oisModel = oisModels[oisApiModelName];
  const filters = filtersMap[oisApiModelName];
  const field  = fieldSpec[oisApiModelName].find(field => field.name === oisModel.key[0]);
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

const filterParams = oisApiModelName => {
  const filters = filtersMap[oisApiModelName];
  return filters.map(filter => {
    const field  = fieldSpec[oisApiModelName].find(field => field.name === filter.field);
    if(!field) {
      throw new Error(`Could not find field to filter: ${oisApiModelName}, ${filter.field}`);
    }
    const sourceModel = field.source ? field.source.relation : oisApiModelName;
    const sourceName = field.source ? field.source.name : field.name;
    const sourceField = oisModels[sourceModel].fields.find(field  => field.name === sourceName);
    const result = {
      name: filter.name,
      type: parametertypeFromField(sourceField),
      renameTo: filter.field,
      schema: filter.schema || schemas.schemaFromField(sourceField, false),
      multi: true
    };
    if(filter.process) {
      result.process = filter.process;
    }
    return result;
  });
};

for(let oisApiModelName of Object.keys(filtersMap)) {
  exports[oisApiModelName] = {
    propertyFilter: filterParams(oisApiModelName),
    id: keyParams(oisApiModelName)
  };
  registry.addMultiple(`ois_${oisApiModelName}`, 'parameterGroup', module.exports[oisApiModelName]);
}
