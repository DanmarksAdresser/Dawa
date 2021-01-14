"use strict";

const oisNamesAndKeys = require('./apiSpecification/ois/namesAndKeys');
const registry = require('./apiSpecification/registry');
var _ = require('underscore');

const allDocs = require('./apidoc/all');
const pathToDocMap = _.indexBy(allDocs, 'path');
const allPages = require('./apidoc/all-pages');

const entityPageMap = _.indexBy(allPages, 'entity');
const allEntityNames = Object.keys(entityPageMap).sort();
const sections = require('./apidoc/sections');
const sectionsBbrFull = require('./apidoc/sections-bbr-full');

exports.addBaseUrlAndParameters = function (baseUrl, path, query) {
  var url = baseUrl + path;
  if (!_.isEmpty(query)) {
    url += '?' + _.map(query,function (param) {
      return encodeURIComponent(param.name) + '=' + (param.encodeValue === false ? param.value : encodeURIComponent(param.value));
    }).join('&');
  }
  return url;
};

exports.addBaseUrlAndParametersForDisplay = function(baseUrl, path, query) {
  var url = baseUrl + path;
  if (!_.isEmpty(query)) {
    url += '?' + _.map(query,function (param) {
        return `${param.name}=${param.value}`;
      }).join('&');
  }
  return url;
};

exports.computeQueryUrl = function (baseUrl, plural, query) {
  var url = baseUrl + '/' + plural;
  if (!_.isEmpty(query)) {
    url += '?' + _.map(query,function (param) {
      return encodeURIComponent(param.name) + '=' + encodeURIComponent(param.value);
    }).join('&');
  }
  return url;
};

exports.extractDocumentationForObject = function (schema) {
  if(schema.properties) {
    var result = _.map(schema.docOrder, function (propertyName) {
      var property = schema.properties[propertyName];
      return exports.extractDocumentationForProperty(property, propertyName);
    });
    return  result;
  }
  else {
    return [];
  }
};

exports.extractDocumentationForResourceResponse = (entity, qualifier) => {
  const representation = registry.findWhere({
    entityName: entity,
    type: 'representation',
    qualifier: qualifier
  });

  const schema = representation.schema;
  return exports.extractDocumentationForObject(schema);
};

// for now, this one just assumes that the schema is compiled
function resolveProperty(property) {
  var propertyDef;
  // use resolved $ref . Description not from $ref overrides.
  if (property.$ref) {
    propertyDef = _.clone(property.__$refResolved);
    if (property.description) {
      propertyDef.description = property.description;
    }
    if (property.hasOwnProperty('postgresql')) {
      propertyDef.postgresql = property.postgresql;
    }
    propertyDef.primary = property.primary;
    propertyDef.deprecated = property.deprecated;
  }
  else {
    propertyDef = property;
  }
  return propertyDef;
}

function isType(type, candidate) {
  if(_.isArray(type)) {
    return type.indexOf(candidate) !== -1;
  }
  return type === candidate;
}

function extractTypeDesc(type) {
  if(!_.isArray(type)) {
    return type;
  }
  return _.without(type, 'null').join(', ');
}

function isNullable(propertyDef) {
  const type = propertyDef.type;
  if(type) {
    return _.isArray(type) && type.indexOf('null') !== -1;
  }
  else if(propertyDef.enum) {
    return _.contains(propertyDef.enum, null);
  }
}

exports.extractDocumentationForProperty = function (property, propertyName) {
  var propertyDef = resolveProperty(property);
  var type = propertyDef.type || 'string';
  var typeDesc = extractTypeDesc(type);
  var result = {
    name: propertyName,
    description: propertyDef.description || '',
    type: typeDesc,
    required: !isNullable(propertyDef)
  };
  if (propertyDef.postgresql) {
    result.postgresql = propertyDef.postgresql;
    result.primary = propertyDef.primary || false;
    result.deprecated = propertyDef.deprecated || false;
  }

  if (isType(propertyDef.type,'array')) {
    var itemDef = resolveProperty(propertyDef.items);
    if (itemDef.type === 'object') {
      result.items = exports.extractDocumentationForObject(itemDef);
    }
    else {
      result.items = [exports.extractDocumentationForProperty(itemDef, 'item')];
    }
  }
  else if (isType(propertyDef.type,'object')) {
    result.properties = exports.extractDocumentationForObject(propertyDef);
  }
  return result;
};

exports.getOisQueryResourcePath = (oisEntityName, variant) => {
  const resource = registry.get({
    entityName: `ois_${oisEntityName}_${variant}`,
    type: 'resource',
    qualifier: 'query'
  });
  return resource.path;
};

exports.getOisGetByKeyResourcePath = (oisEntityName, variant) => {
  const resource = registry.findWhere({
    entityName: `ois_${oisEntityName}_${variant}`,
    type: 'resource',
    qualifier: 'getByKey'
  });
  if(!resource) {
    return null;
  }
  return resource.path.replace(':id', '{id}');
};

const expressToDocRegex = /:([^\/]+)/g;
exports.expressPathToDocPath = path => {
  return path.replace(expressToDocRegex, '{$1}');
}

exports.getPathParameterNames = (docPath) => {
  const regex = /\{([^\}]+)\}/g;
  return (docPath.match(regex) || []).map(match => {
    return match.replace('{', '').replace('}', '');
  });
}

exports.getOisEntityNames = () => {
  return [
    'enhed',
    'bygning',
    'tekniskanlaeg',
    'ejerskab',
    'grund',
    'matrikelreference',
    'opgang',
    'etage',
    'bygningspunkt',
    'kommune'
  ];
};

exports.getOisPlural = (oisEntityName) => {
  return oisNamesAndKeys[oisEntityName].plural;
};

exports.getSections = () => sections;

exports.getSectionsBbrFull = () => sectionsBbrFull;

exports.getEntityNames = () => allEntityNames;

exports.getResourcesForEntity = entityName => allDocs.filter(doc => doc.entity === entityName);
exports.getDocForPath = (path) => {
  if(!pathToDocMap[path]) {
    throw new Error(`No documentation for path ${path}`);
  }
  return pathToDocMap[path];
};

exports.getPageForEntity = entityName => entityPageMap[entityName];

exports.uppercaseFirst = str => {
  if(!str || str === '') {
    return str;
  }
  return str.substring(0,1).toUpperCase() + str.substring(1);
};


exports.exampleDoc = [
  {
    name: 'href',
    description: 'Unikke url',
    type: 'string',
    required: true
  },
  {
    name: 'postnummer',
    description: 'postnummeret',
    type: 'object',
    required: true,
    properties: [
      {
        name: 'nr',
        description: 'postnummeret',
        type: 'integer',
        required: true
      }
    ]
  },
  {
    name: 'kommuner',
    description: 'kommunerne',
    type: 'array',
    required: false,
    items: [
      {
        name: 'href',
        description: 'kommunens URL',
        type: 'string',
        required: false
      }
    ]
  }
];
