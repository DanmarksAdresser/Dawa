"use strict";

var _ = require('underscore');

exports.addBaseUrlAndParameters = function (baseUrl, path, query) {
  var url = baseUrl + path;
  if (!_.isEmpty(query)) {
    url += '?' + _.map(query,function (param) {
      return encodeURIComponent(param.name) + '=' + (param.encodeValue === false ? param.value : encodeURIComponent(param.value));
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

  var result = _.map(schema.docOrder, function (propertyName) {
    var property = schema.properties[propertyName];
    return exports.extractDocumentationForProperty(property, propertyName);
  });
  return  result;
};

// for now, this one just assumes that the schema is compiled
function resolveProperty(property) {
  var propertyDef;
  // use resolved $ref . Description not from $ref overrides.
  if (property.$ref) {
    console.log(JSON.stringify(property));
    propertyDef = _.clone(property.__$refResolved);
    if (property.description) {
      propertyDef.description = property.description;
    }
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

function isNullable(type) {
  return _.isArray(type) && type.indexOf('null') !== -1;
}

exports.extractDocumentationForProperty = function (property, propertyName) {
  var propertyDef = resolveProperty(property);
  var type = propertyDef.type || 'string';
  var typeDesc = extractTypeDesc(type);
  var result = {
    name: propertyName,
    description: propertyDef.description || '',
    type: typeDesc,
    required: !isNullable(type)
  };

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
